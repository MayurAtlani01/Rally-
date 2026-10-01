import { createClient } from '@supabase/supabase-js';
import config from '../config.js';

let adminClient = null;
let customTokenVerifier = null;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    if (config.isTest) {
      // In tests, return a stub client if credentials aren't provided
      return null;
    }
    throw new Error('Supabase admin client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return adminClient;
}

export function createUserClient(accessToken) {
  if (!config.supabaseUrl) {
    throw new Error('createUserClient requires SUPABASE_URL.');
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

/**
 * Strict verification of a Supabase Bearer token using official Supabase auth.getUser().
 * Rejects forged tokens, expired tokens, unverified claims, or missing tokens.
 */
export async function verifyAccessToken(token) {
  if (!token || typeof token !== 'string') {
    return { user: null, error: new Error('Token is missing or not a string.') };
  }

  // Allow custom test verifier hook for isolated test fixtures only
  if (config.isTest && customTokenVerifier) {
    return customTokenVerifier(token);
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    if (config.isTest) {
      return { user: null, error: new Error('Supabase client not initialized in test.') };
    }
    throw new Error('Supabase admin client is not available for token verification.');
  }

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      return { user: null, error: error || new Error('Invalid or expired token.') };
    }
    return { user: data.user, error: null };
  } catch (err) {
    return { user: null, error: err };
  }
}

/**
 * Test utility: register a mock token verifier for isolated unit/integration tests
 */
export function setTestTokenVerifier(fn) {
  if (!config.isTest) {
    throw new Error('setTestTokenVerifier is only permitted during tests.');
  }
  customTokenVerifier = fn;
}
