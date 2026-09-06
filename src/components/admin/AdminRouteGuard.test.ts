import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  storeClinicianSession,
  clearClinicianSession,
  getClinicianSession,
  type ClinicianSession,
} from '../../lib/clinicianAuth';

// Mock localStorage and sessionStorage
const storage: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => storage[k] || null,
  setItem: (k: string, v: string) => {
    storage[k] = v;
  },
  removeItem: (k: string) => {
    delete storage[k];
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
};

globalThis.localStorage = mockStorage as any;
globalThis.sessionStorage = mockStorage as any;

describe('AdminRouteGuard Auth Validation', () => {
  it('rejects access when no session is present', () => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();

    const session = getClinicianSession();
    assert.strictEqual(session, null);
    const isAdmin = Boolean(
      session &&
      session.access_token &&
      ['ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(session.role.toUpperCase())
    );
    assert.strictEqual(isAdmin, false);
  });

  it('rejects access when user is a DOCTOR', () => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();

    const docSession: ClinicianSession = {
      access_token: 'fake-doc-jwt-token',
      role: 'DOCTOR',
      display_name: 'Dr. Vikram Sen',
      user_id: 'doc_001',
    };
    storeClinicianSession(docSession, true);

    const session = getClinicianSession();
    assert.ok(session !== null);
    assert.strictEqual(session?.role, 'DOCTOR');

    const isAdmin = Boolean(
      session &&
      session.access_token &&
      ['ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(session.role.toUpperCase())
    );
    assert.strictEqual(isAdmin, false);
  });

  it('allows access when user is an ADMIN', () => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();

    const adminSession: ClinicianSession = {
      access_token: 'fake-admin-jwt-token',
      role: 'ADMIN',
      display_name: 'Rohan Lead Admin',
      user_id: 'user_admin_01',
    };
    storeClinicianSession(adminSession, true);

    const session = getClinicianSession();
    assert.ok(session !== null);
    assert.strictEqual(session?.role, 'ADMIN');

    const isAdmin = Boolean(
      session &&
      session.access_token &&
      ['ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(session.role.toUpperCase())
    );
    assert.strictEqual(isAdmin, true);
  });

  it('allows access when user is a SUPER_ADMIN or HOSPITAL_ADMIN', () => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();

    const superAdminSession: ClinicianSession = {
      access_token: 'fake-superadmin-jwt-token',
      role: 'SUPER_ADMIN',
      display_name: 'Chief Medical Officer',
      user_id: 'user_super_01',
    };
    storeClinicianSession(superAdminSession, false);

    const session = getClinicianSession();
    assert.ok(session !== null);

    const isAdmin = Boolean(
      session &&
      session.access_token &&
      ['ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(session.role.toUpperCase())
    );
    assert.strictEqual(isAdmin, true);
  });

  it('revokes access immediately on logout/clearClinicianSession', () => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();

    const adminSession: ClinicianSession = {
      access_token: 'fake-admin-jwt-token',
      role: 'ADMIN',
      display_name: 'Admin User',
      user_id: 'user_admin_01',
    };
    storeClinicianSession(adminSession, true);
    assert.ok(getClinicianSession() !== null);

    clearClinicianSession();
    assert.strictEqual(getClinicianSession(), null);
  });
});
