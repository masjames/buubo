import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

let createDecision: any;
let updateDecision: any;
let saveReflection: any;
let createRun: any;
let approveRun: any;
let rejectRun: any;
let createThing: any;
let updateThing: any;
let sql: any;

function hasDatabaseUrl() {
  return Boolean(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_UNPOOLED
  );
}

before(async () => {
  ({ default: sql } = await import('../lib/db'));
  ({ POST: createDecision } = await import('../app/api/decisions/route'));
  ({ PATCH: updateDecision } = await import('../app/api/decisions/[id]/route'));
  ({ POST: saveReflection } = await import('../app/api/reflections/route'));
  ({ POST: createRun } = await import('../app/api/runs/route'));
  ({ POST: approveRun } = await import('../app/api/runs/[id]/approve/route'));
  ({ POST: rejectRun } = await import('../app/api/runs/[id]/reject/route'));
  ({ POST: createThing } = await import('../app/api/things/route'));
  ({ PATCH: updateThing } = await import('../app/api/things/[id]/route'));
});

after(async () => {
  if (sql?.end) {
    await sql.end({ timeout: 1 });
  }
});

function jsonRequest(body: unknown) {
  return new Request('http://viga.test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

async function json(response: Response) {
  return response.json() as Promise<any>;
}

test('Thing capture and status update works', async (t) => {
  if (!hasDatabaseUrl()) {
    t.skip('Database URL env is required for API flow tests');
    return;
  }
  const key = `api-flow-thing-${Date.now()}`;
  const createResponse = await createThing(jsonRequest({
    title: 'Automated test thing',
    body: 'Created by api-flows.test.ts',
    source: 'automated_test',
    idempotency_key: key,
    metadata: { gtd_state: 'inbox' },
  }));

  assert.equal(createResponse.status, 201);
  const thing = await json(createResponse);
  assert.equal(thing.title, 'Automated test thing');
  assert.equal(thing.status, 'active');

  const updateResponse = await updateThing(
    jsonRequest({ status: 'archived', metadata: { gtd_state: 'done', previous_gtd_state: 'doing' } }),
    { params: Promise.resolve({ id: thing.id }) },
  );

  assert.equal(updateResponse.status, 200);
  const updated = await json(updateResponse);
  assert.equal(updated.status, 'archived');
  assert.equal(updated.metadata.gtd_state, 'done');
  assert.equal(updated.metadata.previous_gtd_state, 'doing');
  assert.ok(updated.archived_at);
});

test('Decision can be created and locked', async (t) => {
  if (!hasDatabaseUrl()) {
    t.skip('Database URL env is required for API flow tests');
    return;
  }
  const createResponse = await createDecision(jsonRequest({
    title: `Automated decision ${Date.now()}`,
    statement: 'Use automated flow tests',
    status: 'open',
    metadata: { source: 'automated_test' },
  }));

  assert.equal(createResponse.status, 201);
  const decision = await json(createResponse);
  assert.equal(decision.status, 'open');

  const updateResponse = await updateDecision(
    jsonRequest({ status: 'locked' }),
    { params: Promise.resolve({ id: decision.id }) },
  );

  assert.equal(updateResponse.status, 200);
  const updated = await json(updateResponse);
  assert.equal(updated.status, 'locked');
  assert.ok(updated.locked_at);
});

test('Reflection upsert works for the same date', async (t) => {
  if (!hasDatabaseUrl()) {
    t.skip('Database URL env is required for API flow tests');
    return;
  }
  const date = new Date().toISOString().slice(0, 10);

  const firstResponse = await saveReflection(jsonRequest({
    date,
    wins: 'Automated test first save',
    problems: '',
  }));
  assert.equal(firstResponse.status, 201);

  const secondResponse = await saveReflection(jsonRequest({
    date,
    wins: 'Automated test updated save',
    problems: 'None',
  }));
  assert.equal(secondResponse.status, 201);
  const reflection = await json(secondResponse);
  assert.equal(reflection.wins, 'Automated test updated save');
  assert.equal(reflection.problems, 'None');
});

test('Runs can be approved and rejected', async (t) => {
  if (!hasDatabaseUrl()) {
    t.skip('Database URL env is required for API flow tests');
    return;
  }
  const approveCreateResponse = await createRun(jsonRequest({
    title: `Automated approval run ${Date.now()}`,
    status: 'waiting_approval',
    requires_approval: true,
    approval_status: 'pending',
    metadata: { source: 'automated_test' },
  }));
  assert.equal(approveCreateResponse.status, 201);
  const approvalRun = await json(approveCreateResponse);

  const approveResponse = await approveRun(
    new Request('http://viga.test', { method: 'POST' }),
    { params: Promise.resolve({ id: approvalRun.id }) },
  );
  assert.equal(approveResponse.status, 200);
  const approved = await json(approveResponse);
  assert.equal(approved.approval_status, 'approved');
  assert.equal(approved.status, 'running');

  const rejectCreateResponse = await createRun(jsonRequest({
    title: `Automated rejection run ${Date.now()}`,
    status: 'waiting_approval',
    requires_approval: true,
    approval_status: 'pending',
    metadata: { source: 'automated_test' },
  }));
  assert.equal(rejectCreateResponse.status, 201);
  const rejectionRun = await json(rejectCreateResponse);

  const rejectResponse = await rejectRun(
    new Request('http://viga.test', { method: 'POST' }),
    { params: Promise.resolve({ id: rejectionRun.id }) },
  );
  assert.equal(rejectResponse.status, 200);
  const rejected = await json(rejectResponse);
  assert.equal(rejected.approval_status, 'rejected');
  assert.equal(rejected.status, 'cancelled');
  assert.ok(rejected.completed_at);
});
