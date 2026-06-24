import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const runs = await sql`SELECT * FROM runs ORDER BY created_at DESC`;
    return NextResponse.json(runs);
  } catch (error) {
    console.error('GET runs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, request, source, executor, status, current_step, risk_level, requires_approval, approval_status, metadata } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO runs (title, request, source, executor, status, current_step, risk_level, requires_approval, approval_status, metadata)
      VALUES (${title}, ${request || ''}, ${source || 'app'}, ${executor || ''}, ${status || 'created'}, ${current_step || ''}, ${risk_level || 'safe'}, ${requires_approval || false}, ${approval_status || 'not_required'}, ${metadata || {}})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('POST runs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
