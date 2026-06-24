"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildThingStatePatch, normalizeGTDState, WIP_LIMITS, type CanonicalGTDState } from "@/shared/viga-state";
import type { Thing } from "../types";
import { readJson, writeJson } from "./storage";

export const CACHE_KEY = "buubo_things_cache";
export const OVERRIDES_KEY = "buubo_thing_overrides";
export const PENDING_CAPTURES_KEY = "buubo_pending_captures";

type Override = { id: string; patch: Partial<Thing> };

function merge(server: Thing[], pending: Thing[], overrides: Override[]) {
  const overrideMap = new Map(overrides.map((item) => [item.id, item.patch]));
  const merged = server.map((thing) => {
    const patch = overrideMap.get(thing.id);
    return patch
      ? { ...thing, ...patch, metadata: { ...thing.metadata, ...patch.metadata } }
      : thing;
  });
  const serverIds = new Set(merged.map((thing) => thing.id));
  return [...pending.filter((thing) => !serverIds.has(thing.id)), ...merged];
}

export function useThings() {
  const [things, setThings] = useState<Thing[]>(() => merge(
    readJson<Thing[]>(CACHE_KEY, []),
    readJson<Thing[]>(PENDING_CAPTURES_KEY, []),
    readJson<Override[]>(OVERRIDES_KEY, []),
  ));
  const [connectionLevel, setConnectionLevel] = useState<"online" | "syncing" | "offline">("syncing");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const mounted = useRef(true);

  const hydrate = useCallback((server: Thing[]) => {
    const pending = readJson<Thing[]>(PENDING_CAPTURES_KEY, []);
    const overrides = readJson<Override[]>(OVERRIDES_KEY, []);
    const next = merge(server, pending, overrides);
    setThings(next);
    writeJson(CACHE_KEY, server);
  }, []);

  const fetchThings = useCallback(async () => {
    try {
      const response = await fetch("/api/things", { cache: "no-store" });
      if (!response.ok) throw new Error("Things unavailable");
      const server = (await response.json()) as Thing[];
      if (mounted.current) hydrate(server);
      setConnectionLevel("online");
      return server;
    } catch {
      setConnectionLevel("offline");
      return null;
    }
  }, [hydrate]);

  const updateThingState = useCallback(async (
    thing: Thing,
    nextState: CanonicalGTDState,
    metadataPatch: Record<string, unknown> = {},
  ) => {
    if (thing.id.startsWith("local-")) return false;
    const patch = buildThingStatePatch(thing, nextState, metadataPatch) as Partial<Thing>;
    setThings((current) => current.map((item) => item.id === thing.id
      ? { ...item, ...patch, metadata: { ...item.metadata, ...patch.metadata } }
      : item));
    const overrides = readJson<Override[]>(OVERRIDES_KEY, []).filter((item) => item.id !== thing.id);
    writeJson(OVERRIDES_KEY, [...overrides, { id: thing.id, patch }]);
    setSyncingId(thing.id);
    setConnectionLevel("syncing");
    try {
      const response = await fetch(`/api/things/${thing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error("Update failed");
      writeJson(OVERRIDES_KEY, readJson<Override[]>(OVERRIDES_KEY, []).filter((item) => item.id !== thing.id));
      await fetchThings();
      return true;
    } catch {
      setConnectionLevel("offline");
      return false;
    } finally {
      setSyncingId(null);
    }
  }, [fetchThings]);

  const retryPending = useCallback(async () => {
    const pending = readJson<Thing[]>(PENDING_CAPTURES_KEY, []);
    const overrides = readJson<Override[]>(OVERRIDES_KEY, []);
    if (!pending.length && !overrides.length) {
      await fetch("/api/health/db", { cache: "no-store" }).then((r) => {
        setConnectionLevel(r.ok ? "online" : "offline");
      }).catch(() => setConnectionLevel("offline"));
      return;
    }
    setConnectionLevel("syncing");
    for (const thing of pending) {
      try {
        const response = await fetch("/api/things", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: thing.title,
            body: thing.body,
            status: thing.status,
            metadata: thing.metadata,
            idempotency_key: thing.id,
          }),
        });
        if (response.ok) writeJson(PENDING_CAPTURES_KEY, readJson<Thing[]>(PENDING_CAPTURES_KEY, []).filter((item) => item.id !== thing.id));
      } catch { /* keep queued */ }
    }
    for (const item of overrides) {
      try {
        const response = await fetch(`/api/things/${item.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(item.patch),
        });
        if (response.ok) writeJson(OVERRIDES_KEY, readJson<Override[]>(OVERRIDES_KEY, []).filter((entry) => entry.id !== item.id));
      } catch { /* keep queued */ }
    }
    await fetchThings();
  }, [fetchThings]);

  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => void fetchThings());
    const timer = window.setInterval(() => {
      void retryPending();
      void fetchThings();
    }, 3_000);
    const online = () => void retryPending();
    window.addEventListener("online", online);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, [fetchThings, hydrate, retryPending]);

  useEffect(() => {
    const nextActions = things.filter(t => normalizeGTDState(t) === "next_action" && !t.id.startsWith("local-"))
      .sort((a, b) => {
        if (a.metadata?.is_urgent !== b.metadata?.is_urgent) return a.metadata?.is_urgent ? -1 : 1;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    
    if (nextActions.length > WIP_LIMITS.maxNextAction) {
      const toDemote = nextActions.slice(WIP_LIMITS.maxNextAction);
      for (const thing of toDemote) {
        void updateThingState(thing, "inbox");
      }
    }
  }, [things, updateThingState]);

  return {
    things,
    setThings,
    fetchThings,
    updateThingState,
    connectionLevel,
    syncingId,
    isSynced: connectionLevel === "online" && !syncingId,
    statusText: connectionLevel === "online" ? "Synced" : connectionLevel === "syncing" ? "Saving…" : "Offline · changes queued",
  };
}
