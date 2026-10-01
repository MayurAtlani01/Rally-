import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PgRepo } from '../../backend/src/db/pgliteRepo.js';
import { setTestRepo } from '../../backend/src/db/repo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createTestDatabase() {
  const db = new PGlite();

  // Postgres auth mocks for testing environment
  await db.exec('create schema if not exists auth;');
  await db.exec('create table if not exists auth.users (id uuid primary key, email text);');
  await db.exec('create or replace function auth.uid() returns uuid as $$ select null::uuid; $$ language sql;');
  await db.exec('create or replace function uuid_generate_v4() returns uuid as $$ select gen_random_uuid(); $$ language sql;');

  const m1Path = path.resolve(__dirname, '../../supabase/migrations/20261001000000_rally_schema.sql');
  let m1 = fs.readFileSync(m1Path, 'utf8');
  m1 = m1.replace('create extension if not exists "uuid-ossp";', '-- uuid-ossp alias provided');
  await db.exec(m1);

  const m2Path = path.resolve(__dirname, '../../supabase/migrations/20261001000001_rally_v2_core.sql');
  const m2 = fs.readFileSync(m2Path, 'utf8');
  await db.exec(m2);

  const repo = new PgRepo(db);
  setTestRepo(repo);

  return { db, repo };
}
