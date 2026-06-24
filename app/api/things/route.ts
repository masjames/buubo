import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const things = await sql`SELECT * FROM things ORDER BY created_at DESC LIMIT 100`;
    return NextResponse.json(things);
  } catch (error) {
    console.error('GET things error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, body, source, kind, status, idempotency_key, metadata } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO things (title, body, source, kind, status, idempotency_key, metadata)
      VALUES (${title}, ${body || ''}, ${source || 'app'}, ${kind || 'raw'}, ${status || 'active'}, ${idempotency_key || null}, ${metadata || {}})
      ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = things.updated_at
      RETURNING *
    `;

    const newThing = result[0];

    if (newThing.metadata?.gtd_state === 'next_action') {
      await sql`
        WITH ExcessTasks AS (
          SELECT id
          FROM things
          WHERE metadata->>'gtd_state' = 'next_action'
            AND status != 'archived'
          ORDER BY updated_at DESC
          OFFSET 5
        )
        UPDATE things
        SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{gtd_state}', '"inbox"'), updated_at = NOW()
        WHERE id IN (SELECT id FROM ExcessTasks);
      `;
    }

    return NextResponse.json(newThing, { status: 201 });
  } catch (error) {
    console.error('POST things error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
