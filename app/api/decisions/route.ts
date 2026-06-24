import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const decisions = await sql`SELECT * FROM decisions ORDER BY created_at DESC`;
    return NextResponse.json(decisions);
  } catch (error) {
    console.error('GET decisions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, statement, rationale, status, related_thing_ids, metadata } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO decisions (title, statement, rationale, status, related_thing_ids, metadata)
      VALUES (${title}, ${statement || ''}, ${rationale || ''}, ${status || 'open'}, ${related_thing_ids || []}, ${metadata || {}})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('POST decisions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
