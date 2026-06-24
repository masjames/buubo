import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reflections = await sql`SELECT * FROM reflections ORDER BY date DESC`;
    return NextResponse.json(reflections);
  } catch (error) {
    console.error('GET reflections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { date, wins, problems, ideas, worked, drained, tomorrow_one_thing, metadata } = await req.json();

    const result = await sql`
      INSERT INTO reflections (date, wins, problems, ideas, worked, drained, tomorrow_one_thing, metadata)
      VALUES (${date || new Date().toISOString().split('T')[0]}, ${wins || ''}, ${problems || ''}, ${ideas || ''}, ${worked || ''}, ${drained || ''}, ${tomorrow_one_thing || ''}, ${metadata || {}})
      ON CONFLICT (date) DO UPDATE SET
        wins = EXCLUDED.wins,
        problems = EXCLUDED.problems,
        ideas = EXCLUDED.ideas,
        worked = EXCLUDED.worked,
        drained = EXCLUDED.drained,
        tomorrow_one_thing = EXCLUDED.tomorrow_one_thing,
        updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('POST reflections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
