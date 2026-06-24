import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { source, text, intent, idempotency_key, metadata } = await req.json();

    if (!source || !text) {
      return NextResponse.json({ error: 'source and text are required' }, { status: 400 });
    }

    // Basic routing logic based on intent
    // In V1, we mostly capture as a Thing
    const result = await sql`
      INSERT INTO things (title, body, source, kind, idempotency_key, metadata)
      VALUES (${text.slice(0, 100)}, ${text}, ${source}, ${intent || 'raw'}, ${idempotency_key || null}, ${metadata || {}})
      ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = things.updated_at
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
