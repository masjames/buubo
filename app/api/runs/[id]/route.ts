import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await sql`SELECT * FROM runs WHERE id = ${id}`;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('GET run error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status, current_step, result_summary, failed_reason } = await req.json();

    const result = await sql`
      UPDATE runs
      SET
        status = COALESCE(${status ?? null}, status),
        current_step = COALESCE(${current_step ?? null}, current_step),
        result_summary = COALESCE(${result_summary ?? null}, result_summary),
        failed_reason = COALESCE(${failed_reason ?? null}, failed_reason),
        completed_at = CASE 
          WHEN ${status ?? null}::text IN ('done', 'failed', 'cancelled') THEN COALESCE(completed_at, NOW())
          WHEN ${status ?? null}::text IS NOT NULL THEN NULL
          ELSE completed_at
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
    console.error('PATCH run error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
