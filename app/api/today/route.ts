import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const [activeThings, doneToday, decisionsToday, activeRuns] = await Promise.all([
      sql`SELECT * FROM things WHERE status NOT IN ('done', 'archived') ORDER BY created_at DESC`,
      sql`SELECT * FROM things WHERE status = 'done' AND updated_at >= ${todayIso} ORDER BY updated_at DESC`,
      sql`SELECT * FROM decisions WHERE status = 'locked' AND updated_at >= ${todayIso} ORDER BY updated_at DESC`,
      sql`SELECT * FROM runs WHERE status IN ('created', 'queued', 'running', 'waiting_approval') ORDER BY updated_at DESC`,
    ]);

    return NextResponse.json({
      active_things: activeThings,
      done_today: doneToday,
      decisions_today: decisionsToday,
      active_runs: activeRuns,
    });
  } catch (error) {
    console.error('GET today error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
