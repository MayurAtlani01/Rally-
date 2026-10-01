import { setTestTokenVerifier } from '../../backend/src/db/supabase.js';

const mockUsers = new Map();
let currentTestDb = null;

export function setAuthTestDb(db) {
  currentTestDb = db;
}

export async function registerMockUser(token, user) {
  mockUsers.set(token, user);
  if (currentTestDb && user?.id) {
    await currentTestDb.query(
      'insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing;',
      [user.id, user.email || 'user@test.local']
    );
  }
}

export function clearMockUsers() {
  mockUsers.clear();
}

export function setupTestAuth(db = null) {
  if (db) currentTestDb = db;
  setTestTokenVerifier(async (token) => {
    if (!token) return { user: null, error: new Error('Missing token') };
    const user = mockUsers.get(token);
    if (!user) {
      return { user: null, error: new Error('Invalid or unverified token') };
    }
    return { user, error: null };
  });
}
