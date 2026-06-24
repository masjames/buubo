import assert from "node:assert/strict";
import test from "node:test";
import {
  buildThingStatePatch,
  normalizeGTDState,
  restoreDoneState,
  type CanonicalGTDState,
} from "../shared/viga-state";
import { getVisibleThingActions } from "../shared/viga-actions";

interface LocalThing {
  id: string;
  title: string;
  body: string | null;
  status: string;
  metadata: {
    gtd_state?: string;
    previous_gtd_state?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

const STORAGE: Record<string, string> = {};

Object.defineProperty(globalThis, "window", {
  value: {
    localStorage: {
      getItem: (key: string) => STORAGE[key] ?? null,
      setItem: (key: string, value: string) => {
        STORAGE[key] = value;
      },
      removeItem: (key: string) => {
        delete STORAGE[key];
      },
      clear: () => {
        Object.keys(STORAGE).forEach((key) => delete STORAGE[key]);
      },
    },
  },
  configurable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: (globalThis as any).window.localStorage,
  configurable: true,
});

function resetStorage() {
  Object.keys(STORAGE).forEach((key) => delete STORAGE[key]);
}

function writeCachedThings(things: LocalThing[]) {
  localStorage.setItem("viga_cached_things", JSON.stringify(things));
}

function updateLocalThing(id: string, patch: Partial<LocalThing>) {
  const overrides = JSON.parse(localStorage.getItem("viga_local_thing_overrides") || "[]");
  const filtered = overrides.filter((o: any) => o.id !== id);
  filtered.push({ id, ...patch });
  localStorage.setItem("viga_local_thing_overrides", JSON.stringify(filtered));
}

function mergeThingsWithLocal(serverThings: LocalThing[]): LocalThing[] {
  const overrides = JSON.parse(localStorage.getItem("viga_local_thing_overrides") || "[]");
  const overrideMap = new Map(overrides.map((o: any) => [o.id, o]));
  return serverThings.map((thing) => {
    const override = overrideMap.get(thing.id);
    if (!override) return thing;
    return {
      ...thing,
      status: override.status || thing.status,
      metadata: {
        ...thing.metadata,
        ...override.metadata,
      },
    };
  });
}

function thing(state: CanonicalGTDState = "inbox"): LocalThing {
  return {
    id: "server-thing-1",
    title: "Button test thing",
    body: null,
    status: state === "done" ? "archived" : "active",
    metadata: { gtd_state: state },
    created_at: "2026-06-15T00:00:00.000Z",
    updated_at: "2026-06-15T00:00:00.000Z",
  };
}

test("state button payloads write the canonical DB metadata", () => {
  const inboxThing = thing("inbox");

  const doing = buildThingStatePatch(inboxThing, "doing");
  assert.equal(doing.status, "active");
  assert.equal(doing.metadata.gtd_state, "doing");
  assert.ok(doing.metadata.last_started_at);

  const nextAction = buildThingStatePatch(inboxThing, "next_action");
  assert.equal(nextAction.status, "active");
  assert.equal(nextAction.metadata.gtd_state, "next_action");

  const waiting = buildThingStatePatch(inboxThing, "waiting");
  assert.equal(waiting.status, "active");
  assert.equal(waiting.metadata.gtd_state, "waiting");

  const done = buildThingStatePatch(
    { ...inboxThing, metadata: { gtd_state: "doing" } },
    "done",
  );
  assert.equal(done.status, "archived");
  assert.equal(done.metadata.gtd_state, "done");
  assert.equal(done.metadata.previous_gtd_state, "doing");
  assert.ok(done.metadata.completed_at);
});

test("done and cancelled restore returns to the previous non-done state, then falls back to inbox", () => {
  assert.equal(
    restoreDoneState({
      status: "archived",
      metadata: { gtd_state: "done", previous_gtd_state: "next_action" },
    }),
    "next_action",
  );

  assert.equal(
    restoreDoneState({
      status: "archived",
      metadata: { gtd_state: "done" },
    }),
    "inbox",
  );

  assert.equal(
    restoreDoneState({
      status: "archived",
      metadata: { gtd_state: "dropped", previous_gtd_state: "doing" },
    }),
    "doing",
  );
});

test("legacy server states normalize into the canonical states", () => {
  assert.equal(
    normalizeGTDState({ status: "active", metadata: { gtd_state: "do_now" } }),
    "doing",
  );
  assert.equal(
    normalizeGTDState({
      status: "active",
      metadata: { gtd_state: "next_things" },
    }),
    "next_action",
  );
  assert.equal(
    normalizeGTDState({
      status: "active",
      metadata: { gtd_state: "wait_delegate" },
    }),
    "waiting",
  );
  assert.equal(
    normalizeGTDState({
      status: "active",
      metadata: { gtd_state: "delegated" },
    }),
    "waiting",
  );
  assert.equal(
    normalizeGTDState({
      status: "archived",
      metadata: { gtd_state: "archived" },
    }),
    "done",
  );
  assert.equal(
    normalizeGTDState({
      status: "active",
      metadata: { gtd_state: "dropped" },
    }),
    "dropped",
  );
});

test("local override keeps a state button change after refresh/cache merge", () => {
  resetStorage();
  const serverThing = thing("inbox");
  writeCachedThings([serverThing]);

  const payload = buildThingStatePatch(serverThing, "doing");
  updateLocalThing(serverThing.id, payload);

  const afterRefresh = mergeThingsWithLocal([serverThing]);
  assert.equal(afterRefresh.length, 1);
  assert.equal(normalizeGTDState(afterRefresh[0]), "doing");
  assert.equal(afterRefresh[0].status, "active");
});

test("visible action buttons follow the Flow and Things rules", () => {
  assert.deepEqual(getVisibleThingActions("inbox", "things"), [
    "next_action",
    "waiting",
    "parked",
    "archive",
  ]);
  assert.deepEqual(getVisibleThingActions("waiting", "things"), [
    "doing",
    "next_action",
    "inbox",
    "archive",
  ]);
  assert.deepEqual(getVisibleThingActions("parked", "things"), [
    "next_action",
    "inbox",
    "archive",
  ]);
  assert.deepEqual(getVisibleThingActions("next_action", "things"), []);
  assert.deepEqual(getVisibleThingActions("doing", "things"), []);

  assert.deepEqual(getVisibleThingActions("doing", "flow"), [
    "pause",
    "done",
    "drop",
    "stuck",
  ]);
  assert.deepEqual(getVisibleThingActions("next_action", "flow"), [
    "play",
    "done",
    "drop",
  ]);
  assert.deepEqual(getVisibleThingActions("inbox", "flow"), []);
  assert.deepEqual(getVisibleThingActions("waiting", "flow"), []);

  assert.deepEqual(getVisibleThingActions("done", "things"), ["restore"]);
  assert.deepEqual(getVisibleThingActions("dropped", "things"), ["restore"]);
  assert.deepEqual(getVisibleThingActions("done", "flow"), ["restore"]);
});
