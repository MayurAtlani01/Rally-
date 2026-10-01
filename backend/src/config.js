import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);

const config = {
  isTest,
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || '127.0.0.1',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5173',
  supabaseUrl: process.env.SUPABASE_URL || (isTest ? 'https://test-project.supabase.co' : ''),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || (isTest ? 'test-service-role-key' : ''),
  dataMode: process.env.RALLY_MODE || 'supabase', // Normal operation must be 'supabase'
  urgentEscalationMinutesDefault: Number(process.env.URGENT_ESCALATION_MINUTES) || 15,
  escalationIntervalMs: Number(process.env.ESCALATION_INTERVAL_MS) || 60 * 1000
};

// Config validation helpers
export function checkConfig() {
  if (config.isTest) {
    return { valid: true, missing: [] };
  }
  const missing = [];
  if (!config.supabaseUrl || config.supabaseUrl.trim() === '') {
    missing.push('SUPABASE_URL');
  }
  if (!config.supabaseServiceRoleKey || config.supabaseServiceRoleKey.trim() === '') {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  return {
    valid: missing.length === 0,
    missing,
    error: missing.length > 0
      ? `Missing required Supabase environment variables: ${missing.join(', ')}. Normal operation requires verified Supabase identity and Postgres persistence. Please set them in backend/.env.`
      : null
  };
}

export function validateConfig() {
  const result = checkConfig();
  if (!result.valid) {
    throw new Error(`[RALLY Config Error] ${result.error}`);
  }
}

export default config;
