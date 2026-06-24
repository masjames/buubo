"use client";

import { useCallback } from "react";
import type { CanonicalGTDState } from "@/shared/viga-state";
import type { Thing } from "../types";
import { PENDING_CAPTURES_KEY } from "./useThings";
import { readJson, writeJson } from "./storage";

export function useCapture(
  setThings: React.Dispatch<React.SetStateAction<Thing[]>>,
  fetchThings: () => Promise<Thing[] | null>,
) {
  return useCallback(async (
    title: string,
    options: { gtdState: CanonicalGTDState; isUrgent?: boolean; metadata?: Record<string, unknown> },
  ) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return null;
    const now = new Date().toISOString();
    const temp: Thing = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: cleanTitle,
      status: "active",
      created_at: now,
      updated_at: now,
      is_pending: true,
      metadata: {
        gtd_state: options.gtdState,
        is_urgent: Boolean(options.isUrgent),
        undecided_since: now,
        ...(options.gtdState === "doing" ? { last_started_at: now, active_loop_since: now } : {}),
        ...options.metadata,
      },
    };
    writeJson(PENDING_CAPTURES_KEY, [temp, ...readJson<Thing[]>(PENDING_CAPTURES_KEY, [])]);
    setThings((current) => [temp, ...current]);
    try {
      const response = await fetch("/api/things", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: temp.title,
          status: temp.status,
          metadata: temp.metadata,
          idempotency_key: temp.id,
        }),
      });
      if (!response.ok) throw new Error("Capture failed");
      writeJson(PENDING_CAPTURES_KEY, readJson<Thing[]>(PENDING_CAPTURES_KEY, []).filter((item) => item.id !== temp.id));
      await fetchThings();
    } catch {
      // The optimistic item remains in the retry queue.
    }
    return temp;
  }, [fetchThings, setThings]);
}

