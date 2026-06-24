import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Build update query dynamically or just hardcode common fields
    const { title, body: thingBody, status, kind } = body;
    const metadata = body.metadata === undefined ? undefined : { ...body.metadata };
    if (metadata?.gtd_state === 'cancelled') metadata.gtd_state = 'dropped';
    if (metadata?.gtd_state === 'waiting_delegate') metadata.gtd_state = 'waiting';
    if (metadata?.gtd_state === 'dropped' && !metadata.dropped_at) metadata.dropped_at = new Date().toISOString();
    if (metadata?.gtd_state === 'done' && !metadata.completed_at) metadata.completed_at = new Date().toISOString();
    
    const result = metadata === undefined
      ? await sql`
        UPDATE things
        SET
          title = COALESCE(${title ?? null}, title),
          body = COALESCE(${thingBody ?? null}, body),
          status = COALESCE(${status ?? null}, status),
          kind = COALESCE(${kind ?? null}, kind),
          archived_at = CASE
            WHEN ${status ?? null}::text = 'archived' THEN COALESCE(archived_at, NOW())
            WHEN ${status ?? null}::text IS NOT NULL THEN NULL
            ELSE archived_at
          END,
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      : await sql`
        UPDATE things
        SET
          title = COALESCE(${title ?? null}, title),
          body = COALESCE(${thingBody ?? null}, body),
          status = COALESCE(${status ?? null}, status),
          kind = COALESCE(${kind ?? null}, kind),
          metadata = metadata || ${metadata},
          archived_at = CASE
            WHEN ${status ?? null}::text = 'archived' THEN COALESCE(archived_at, NOW())
            WHEN ${status ?? null}::text IS NOT NULL THEN NULL
            ELSE archived_at
          END,
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (result[0].metadata?.gtd_state === 'next_action') {
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

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('PATCH thing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
