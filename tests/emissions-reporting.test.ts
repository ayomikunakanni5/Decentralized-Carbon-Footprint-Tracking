import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockContractEnv = () => {
  const emissionsReports = new Map();
  const entityReports = new Map();
  let admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Example principal
  let txSender = admin;
  let blockHeight = 100;
  
  return {
    // Contract state
    emissionsReports,
    entityReports,
    admin,
    
    // Environment functions
    setTxSender: (sender) => { txSender = sender; },
    getTxSender: () => txSender,
    setBlockHeight: (height) => { blockHeight = height; },
    getBlockHeight: () => blockHeight,
    
    // Contract functions
    submitReport: (reportId, entityId, methodologyId, emissionsAmount, periodStart, periodEnd) => {
      if (txSender !== admin) {
        return { err: 403 };
      }
      
      if (emissionsReports.has(reportId)) {
        return { err: 100 };
      }
      
      // Store the report
      emissionsReports.set(reportId, {
        'entity-id': entityId,
        'methodology-id': methodologyId,
        'emissions-amount': emissionsAmount,
        'reporting-period-start': periodStart,
        'reporting-period-end': periodEnd,
        'submission-date': blockHeight,
        status: 'pending'
      });
      
      // Update entity reports list
      const currentReports = entityReports.get(entityId) || { 'report-ids': [] };
      if (currentReports['report-ids'].length >= 100) {
        return { err: 101 };
      }
      
      currentReports['report-ids'].push(reportId);
      entityReports.set(entityId, currentReports);
      
      return { ok: true };
    },
    
    verifyReport: (reportId) => {
      if (txSender !== admin) {
        return { err: 403 };
      }
      
      if (!emissionsReports.has(reportId)) {
        return { err: 404 };
      }
      
      const report = emissionsReports.get(reportId);
      report.status = 'verified';
      emissionsReports.set(reportId, report);
      
      return { ok: true };
    },
    
    getReport: (reportId) => {
      return emissionsReports.has(reportId) ? emissionsReports.get(reportId) : null;
    },
    
    getEntityReports: (entityId) => {
      return entityReports.get(entityId) || null;
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

describe('Emissions Reporting Contract', () => {
  let contract;
  
  beforeEach(() => {
    contract = mockContractEnv();
  });
  
  it('should submit a new emissions report', () => {
    const result = contract.submitReport(
        'report1',
        'entity1',
        'method1',
        1000, // emissions amount in tons CO2e
        90,   // period start (block height)
        99    // period end (block height)
    );
    expect(result).toEqual({ ok: true });
    
    const report = contract.getReport('report1');
    expect(report).toEqual({
      'entity-id': 'entity1',
      'methodology-id': 'method1',
      'emissions-amount': 1000,
      'reporting-period-start': 90,
      'reporting-period-end': 99,
      'submission-date': 100,
      status: 'pending'
    });
    
    const entityReports = contract.getEntityReports('entity1');
    expect(entityReports['report-ids']).toContain('report1');
  });
  
  it('should not allow duplicate report submission', () => {
    contract.submitReport('report1', 'entity1', 'method1', 1000, 90, 99);
    const result = contract.submitReport('report1', 'entity1', 'method1', 1200, 100, 110);
    expect(result).toEqual({ err: 100 });
  });
  
  it('should verify a report', () => {
    contract.submitReport('report1', 'entity1', 'method1', 1000, 90, 99);
    const result = contract.verifyReport('report1');
    expect(result).toEqual({ ok: true });
    
    const report = contract.getReport('report1');
    expect(report.status).toBe('verified');
  });
  
  it('should not verify a non-existent report', () => {
    const result = contract.verifyReport('nonexistent');
    expect(result).toEqual({ err: 404 });
  });
  
  it('should not allow non-admin to submit reports', () => {
    contract.setTxSender('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    const result = contract.submitReport('report1', 'entity1', 'method1', 1000, 90, 99);
    expect(result).toEqual({ err: 403 });
  });
  
  it('should track multiple reports for an entity', () => {
    contract.submitReport('report1', 'entity1', 'method1', 1000, 90, 99);
    contract.submitReport('report2', 'entity1', 'method1', 950, 100, 110);
    
    const entityReports = contract.getEntityReports('entity1');
    expect(entityReports['report-ids']).toHaveLength(2);
    expect(entityReports['report-ids']).toContain('report1');
    expect(entityReports['report-ids']).toContain('report2');
  });
});
