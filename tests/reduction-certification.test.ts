import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockContractEnv = () => {
  const certificates = new Map();
  const entityCertificates = new Map();
  let admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Example principal
  let txSender = admin;
  let blockHeight = 100;
  
  return {
    // Contract state
    certificates,
    entityCertificates,
    admin,
    
    // Environment functions
    setTxSender: (sender) => { txSender = sender; },
    getTxSender: () => txSender,
    setBlockHeight: (height) => { blockHeight = height; },
    getBlockHeight: () => blockHeight,
    
    // Contract functions
    issueCertificate: (certId, entityId, baselineReportId, currentReportId, reductionAmount, validityPeriod) => {
      if (txSender !== admin) {
        return { err: 403 };
      }
      
      if (certificates.has(certId)) {
        return { err: 100 };
      }
      
      // Store the certificate
      certificates.set(certId, {
        'entity-id': entityId,
        'baseline-report-id': baselineReportId,
        'current-report-id': currentReportId,
        'reduction-amount': reductionAmount,
        'issuance-date': blockHeight,
        'expiration-date': blockHeight + validityPeriod,
        status: 'active'
      });
      
      // Update entity certificates list
      const currentCerts = entityCertificates.get(entityId) || { 'certificate-ids': [] };
      if (currentCerts['certificate-ids'].length >= 100) {
        return { err: 101 };
      }
      
      currentCerts['certificate-ids'].push(certId);
      entityCertificates.set(entityId, currentCerts);
      
      return { ok: true };
    },
    
    revokeCertificate: (certId) => {
      if (txSender !== admin) {
        return { err: 403 };
      }
      
      if (!certificates.has(certId)) {
        return { err: 404 };
      }
      
      const cert = certificates.get(certId);
      cert.status = 'revoked';
      certificates.set(certId, cert);
      
      return { ok: true };
    },
    
    getCertificate: (certId) => {
      return certificates.has(certId) ? certificates.get(certId) : null;
    },
    
    getEntityCertificates: (entityId) => {
      return entityCertificates.get(entityId) || null;
    },
    
    isCertificateValid: (certId) => {
      if (!certificates.has(certId)) {
        return false;
      }
      
      const cert = certificates.get(certId);
      return cert.status === 'active' && blockHeight <= cert['expiration-date'];
    },
    
    setAdmin: (newAdmin) => {
      if (txSender !== admin) {
        return { err: 403 };
      }
      
      admin = newAdmin;
      return { ok: true };
    }
  };
};

describe('Reduction Certification Contract', () => {
  let contract;
  
  beforeEach(() => {
    contract = mockContractEnv();
  });
  
  it('should issue a new reduction certificate', () => {
    const result = contract.issueCertificate(
        'cert1',
        'entity1',
        'report1',
        'report2',
        50,    // reduction amount in tons CO2e
        365    // validity period in blocks
    );
    expect(result).toEqual({ ok: true });
    
    const cert = contract.getCertificate('cert1');
    expect(cert).toEqual({
      'entity-id': 'entity1',
      'baseline-report-id': 'report1',
      'current-report-id': 'report2',
      'reduction-amount': 50,
      'issuance-date': 100,
      'expiration-date': 465,
      status: 'active'
    });
    
    const entityCerts = contract.getEntityCertificates('entity1');
    expect(entityCerts['certificate-ids']).toContain('cert1');
  });
  
  it('should not allow duplicate certificate issuance', () => {
    contract.issueCertificate('cert1', 'entity1', 'report1', 'report2', 50, 365);
    const result = contract.issueCertificate('cert1', 'entity1', 'report1', 'report2', 60, 365);
    expect(result).toEqual({ err: 100 });
  });
  
  it('should revoke a certificate', () => {
    contract.issueCertificate('cert1', 'entity1', 'report1', 'report2', 50, 365);
    const result = contract.revokeCertificate('cert1');
    expect(result).toEqual({ ok: true });
    
    const cert = contract.getCertificate('cert1');
    expect(cert.status).toBe('revoked');
  });
  
  it('should not revoke a non-existent certificate', () => {
    const result = contract.revokeCertificate('nonexistent');
    expect(result).toEqual({ err: 404 });
  });
  
  it('should validate certificate status correctly', () => {
    contract.issueCertificate('cert1', 'entity1', 'report1', 'report2', 50, 365);
    expect(contract.isCertificateValid('cert1')).toBe(true);
    
    // Expired certificate
    contract.setBlockHeight(500);
    expect(contract.isCertificateValid('cert1')).toBe(false);
    
    // Reset block height and revoke
    contract.setBlockHeight(100);
    contract.revokeCertificate('cert1');
    expect(contract.isCertificateValid('cert1')).toBe(false);
  });
  
  it('should not allow non-admin to issue certificates', () => {
    contract.setTxSender('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    const result = contract.issueCertificate('cert1', 'entity1', 'report1', 'report2', 50, 365);
    expect(result).toEqual({ err: 403 });
  });
});
