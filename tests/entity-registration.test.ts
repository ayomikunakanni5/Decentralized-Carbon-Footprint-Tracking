import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockContractEnv = () => {
  const entities = new Map();
  let admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Example principal
  let txSender = admin;
  let blockHeight = 100;
  
  return {
    // Contract state
    entities,
    admin,
    
    // Environment functions
    setTxSender: (sender) => { txSender = sender; },
    getTxSender: () => txSender,
    setBlockHeight: (height) => { blockHeight = height; },
    getBlockHeight: () => blockHeight,
    
    // Contract functions
    registerEntity: (entityId, name, industry) => {
      if (txSender !== admin) {
        return { err: 403 };
      }
      
      if (entities.has(entityId)) {
        return { err: 100 };
      }
      
      entities.set(entityId, {
        name,
        'registration-date': blockHeight,
        status: 'pending',
        industry
      });
      
      return { ok: true };
    },
    
    verifyEntity: (entityId) => {
      if (txSender !== admin) {
        return { err: 403 };
      }
      
      if (!entities.has(entityId)) {
        return { err: 404 };
      }
      
      const entity = entities.get(entityId);
      entity.status = 'verified';
      entities.set(entityId, entity);
      
      return { ok: true };
    },
    
    getEntity: (entityId) => {
      return entities.has(entityId) ? entities.get(entityId) : null;
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

describe('Entity Registration Contract', () => {
  let contract;
  
  beforeEach(() => {
    contract = mockContractEnv();
  });
  
  it('should register a new entity', () => {
    const result = contract.registerEntity('entity1', 'Test Company', 'Energy');
    expect(result).toEqual({ ok: true });
    
    const entity = contract.getEntity('entity1');
    expect(entity).toEqual({
      name: 'Test Company',
      'registration-date': 100,
      status: 'pending',
      industry: 'Energy'
    });
  });
  
  it('should not allow duplicate entity registration', () => {
    contract.registerEntity('entity1', 'Test Company', 'Energy');
    const result = contract.registerEntity('entity1', 'Another Company', 'Manufacturing');
    expect(result).toEqual({ err: 100 });
  });
  
  it('should verify an entity', () => {
    contract.registerEntity('entity1', 'Test Company', 'Energy');
    const result = contract.verifyEntity('entity1');
    expect(result).toEqual({ ok: true });
    
    const entity = contract.getEntity('entity1');
    expect(entity.status).toBe('verified');
  });
  
  it('should not verify a non-existent entity', () => {
    const result = contract.verifyEntity('nonexistent');
    expect(result).toEqual({ err: 404 });
  });
  
  it('should not allow non-admin to register entities', () => {
    contract.setTxSender('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    const result = contract.registerEntity('entity1', 'Test Company', 'Energy');
    expect(result).toEqual({ err: 403 });
  });
  
  it('should allow admin transfer', () => {
    const newAdmin = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const result = contract.setAdmin(newAdmin);
    expect(result).toEqual({ ok: true });
    
    // New admin should be able to register entities
    contract.setTxSender(newAdmin);
    const registerResult = contract.registerEntity('entity1', 'Test Company', 'Energy');
    expect(registerResult).toEqual({ ok: true });
  });
});
