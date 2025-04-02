import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockContractEnv = () => {
  const methodologies = new Map();
  let admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Example principal
  let txSender = admin;
  let blockHeight = 100;
  
  return {
    // Contract state
    methodologies,
    admin,
    
    // Environment functions
    setTxSender: (sender) => { txSender = sender; },
    getTxSender: () => txSender,
    setBlockHeight: (height) => { blockHeight = height; },
    getBlockHeight: () => blockHeight,
    
    // Contract functions
    registerMethodology: (methodologyId, name, description, industry) => {
      if (txSender !== admin) {
        return { err: 403 };
      }
      
      if (methodologies.has(methodologyId)) {
        return { err: 100 };
      }
      
      methodologies.set(methodologyId, {
        name,
        description,
        'creation-date': blockHeight,
        status: 'pending',
        industry
      });
      
      return { ok: true };
    },
    
    verifyMethodology: (methodologyId) => {
      if (txSender !== admin) {
        return { err: 403 };
      }
      
      if (!methodologies.has(methodologyId)) {
        return { err: 404 };
      }
      
      const methodology = methodologies.get(methodologyId);
      methodology.status = 'verified';
      methodologies.set(methodologyId, methodology);
      
      return { ok: true };
    },
    
    getMethodology: (methodologyId) => {
      return methodologies.has(methodologyId) ? methodologies.get(methodologyId) : null;
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

describe('Methodology Verification Contract', () => {
  let contract;
  
  beforeEach(() => {
    contract = mockContractEnv();
  });
  
  it('should register a new methodology', () => {
    const result = contract.registerMethodology(
        'method1',
        'GHG Protocol',
        'Standard method for corporate accounting',
        'All'
    );
    expect(result).toEqual({ ok: true });
    
    const methodology = contract.getMethodology('method1');
    expect(methodology).toEqual({
      name: 'GHG Protocol',
      description: 'Standard method for corporate accounting',
      'creation-date': 100,
      status: 'pending',
      industry: 'All'
    });
  });
  
  it('should not allow duplicate methodology registration', () => {
    contract.registerMethodology('method1', 'GHG Protocol', 'Description', 'All');
    const result = contract.registerMethodology('method1', 'Another Method', 'Description', 'Energy');
    expect(result).toEqual({ err: 100 });
  });
  
  it('should verify a methodology', () => {
    contract.registerMethodology('method1', 'GHG Protocol', 'Description', 'All');
    const result = contract.verifyMethodology('method1');
    expect(result).toEqual({ ok: true });
    
    const methodology = contract.getMethodology('method1');
    expect(methodology.status).toBe('verified');
  });
  
  it('should not verify a non-existent methodology', () => {
    const result = contract.verifyMethodology('nonexistent');
    expect(result).toEqual({ err: 404 });
  });
  
  it('should not allow non-admin to register methodologies', () => {
    contract.setTxSender('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    const result = contract.registerMethodology('method1', 'GHG Protocol', 'Description', 'All');
    expect(result).toEqual({ err: 403 });
  });
});
