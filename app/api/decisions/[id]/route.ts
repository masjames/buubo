import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { title, statement, rationale, status, related_thing_ids } = await req.json();

    const result = await sql`
      UPDATE decisions
      SET
        title = COALESCE(${title ?? null}, title),
        statement = COALESCE(${statement ?? null}, statement),
        rationale = COALESCE(${rationale ?? null}, rationale),
        status = COALESCE(${status ?? null}, status),
        related_thing_ids = COALESCE(${related_thing_ids ?? null}, related_thing_ids),
        locked_at = CASE 
          WHEN ${status ?? null}::text = 'locked' THEN COALESCE(locked_at, NOW())
          WHEN ${status ?? null}::text IS NOT NULL THEN NULL
          ELSE locked_at
        END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('PATCH decision error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
