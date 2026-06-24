import { NextResponse } from 'next/server';
import sql, { databaseEnvKey } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await sql`SELECT NOW() as now`;

    return NextResponse.json({
      ok: true,
      database_env_key: databaseEnvKey,
      now: result[0]?.now,
    });
  } catch (error) {
    console.error('DB health error:', error);

    return NextResponse.json({
      ok: false,
      database_env_key: databaseEnvKey || null,
      error: error instanceof Error ? error.message : 'Unknown database error',
    }, { status: 500 });
  }
}
