import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../backend/src/server.js';
import { createTestDatabase } from './helpers/testDb.js';
import { setupTestAuth, registerMockUser, clearMockUsers } from './helpers/authHelper.js';

describe('HTTP Authentication & Identity Verification', () => {
  let server;
  let baseUrl;

  before(async () => {
    const { db } = await createTestDatabase();
    setupTestAuth(db);

    server = createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    clearMockUsers();
  });

  it('rejects requests with missing Authorization header (401 UNAUTHENTICATED)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, 'UNAUTHENTICATED');
  });

  it('rejects requests relying solely on x-user-id header (401 UNAUTHENTICATED)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'x-user-id': '00000000-0000-0000-0000-000000000001'
      }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, 'UNAUTHENTICATED');
  });

  it('rejects demo tokens like demo-token-* (401 INVALID_TOKEN)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: 'Bearer demo-token-12345'
      }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, 'INVALID_TOKEN');
  });

  it('rejects forged or unverifiable Bearer tokens (401 INVALID_TOKEN)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: 'Bearer forged.jwt.token'
      }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, 'INVALID_TOKEN');
  });

  it('authenticates valid verified Supabase tokens and populates /me identity', async () => {
    const userId = 'a0000000-0000-0000-0000-000000000001';
    const token = 'valid-token-alice';
    await registerMockUser(token, {
      id: userId,
      email: 'alice@fest.org',
      user_metadata: { full_name: 'Alice Springs', phone: '1234567890' }
    });

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.id, userId);
    assert.equal(body.user.email, 'alice@fest.org');
    assert.equal(body.user.fullName, 'Alice Springs');
  });

  it('profile sync rejects attempts to spoof or overwrite another user’s identity (403)', async () => {
    const userId = 'a0000000-0000-0000-0000-000000000002';
    const victimId = 'a0000000-0000-0000-0000-000000000003';
    const token = 'valid-token-bob';
    await registerMockUser(token, {
      id: userId,
      email: 'bob@fest.org',
      user_metadata: { full_name: 'Bob Builder' }
    });

    const res = await fetch(`${baseUrl}/api/auth/sync-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: victimId, // Attempt to overwrite victimId
        fullName: 'Hacked Name'
      })
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, 'IDENTITY_SPOOFING_FORBIDDEN');
  });

  it('profile sync updates own profile successfully for verified user', async () => {
    const userId = 'a0000000-0000-0000-0000-000000000004';
    const token = 'valid-token-charlie';
    await registerMockUser(token, {
      id: userId,
      email: 'charlie@fest.org',
      user_metadata: { full_name: 'Charlie Day' }
    });

    const res = await fetch(`${baseUrl}/api/auth/sync-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: userId,
        fullName: 'Charlie Kelly',
        phone: '555-0199',
        bio: 'Logistics enthusiast'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.fullName, 'Charlie Kelly');
    assert.equal(body.user.phone, '555-0199');
    assert.equal(body.user.bio, 'Logistics enthusiast');
  });

  it('demo authentication endpoints are completely removed and return 404 in normal operation', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@demo.local' })
    });
    assert.equal(loginRes.status, 404);

    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@demo.local', fullName: 'Demo' })
    });
    assert.equal(signupRes.status, 404);

    const resetRes = await fetch(`${baseUrl}/api/auth/reset-demo`, {
      method: 'POST'
    });
    assert.equal(resetRes.status, 404);
  });
});
