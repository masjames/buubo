import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function init() {
  console.log('Initializing database...');

  try {
    // Things Table
    await sql`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS things (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT DEFAULT 'default',
        title TEXT NOT NULL,
        body TEXT,
        source TEXT,
        kind TEXT DEFAULT 'raw',
        status TEXT DEFAULT 'active',
        idempotency_key TEXT UNIQUE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        archived_at TIMESTAMPTZ
      );
    `;

    await sql`
      ALTER TABLE things ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
    `;

    // Decisions Table
    await sql`
      CREATE TABLE IF NOT EXISTS decisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT DEFAULT 'default',
        title TEXT NOT NULL,
        statement TEXT,
        rationale TEXT,
        status TEXT DEFAULT 'open',
        related_thing_ids UUID[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        locked_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Reflections Table
    await sql`
      CREATE TABLE IF NOT EXISTS reflections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT DEFAULT 'default',
        date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
        wins TEXT,
        problems TEXT,
        ideas TEXT,
        worked TEXT,
        drained TEXT,
        tomorrow_one_thing TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Runs Table
    await sql`
      CREATE TABLE IF NOT EXISTS runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT DEFAULT 'default',
        title TEXT NOT NULL,
        request TEXT,
        source TEXT,
        executor TEXT,
        status TEXT DEFAULT 'created',
        current_step TEXT,
        risk_level TEXT DEFAULT 'safe',
        requires_approval BOOLEAN DEFAULT FALSE,
        approval_status TEXT DEFAULT 'not_required',
        result_summary TEXT,
        artifact_links TEXT[] DEFAULT '{}',
        failed_reason TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS things_status_created_at_idx ON things (status, created_at DESC);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS decisions_status_created_at_idx ON decisions (status, created_at DESC);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS runs_status_created_at_idx ON runs (status, created_at DESC);
    `;

    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

init();
