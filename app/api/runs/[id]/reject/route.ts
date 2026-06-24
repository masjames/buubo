import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await sql`
      UPDATE runs
      SET approval_status = 'rejected',
          status = 'cancelled',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Reject run error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
