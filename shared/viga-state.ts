export type CanonicalGTDState =
  | "inbox"
  | "waiting"
  | "next_action"
  | "parked"
  | "doing"
  | "done"
  | "dropped";
export type LegacyGTDState =
  | "do_now"
  | "next_things"
  | "wait_delegate"
  | "waiting_delegate"
  | "waiting_for"
  | "delegated"
  | "archived"
  | "cancelled";
export type LocalGTDState = CanonicalGTDState | LegacyGTDState;

export const WIP_LIMITS = { maxDoing: 1, maxNextAction: 5 } as const;
export const STUCK_EXITS = ["make_smaller", "prompt_ai", "ugly_draft", "five_minutes", "park_it"] as const;
export const DROP_REASONS = [
  "not_important",
  "too_big",
  "wrong_timing",
  "need_clarity",
  "waiting_on_someone",
] as const;

export type ThingStateSource = {
  title?: string;
  status?: string;
  metadata?: {
    gtd_state?: LocalGTDState;
    previous_gtd_state?: CanonicalGTDState | LegacyGTDState;
    total_run_time_ms?: number;
    last_started_at?: string | null;
    dropped_at?: string;
    cancelled_at?: string;
    completed_at?: string;
    first_physical_action?: string;
    [key: string]: unknown;
  };
};

export function normalizeGtdStateValue(state?: string, status?: string): CanonicalGTDState {
  if (state === "doing" || state === "do_now") return "doing";
  if (state === "next_action" || state === "next_things") return "next_action";
  if (state === "parked") return "parked";
  if (
    state === "waiting" ||
    state === "waiting_delegate" ||
    state === "wait_delegate" ||
    state === "waiting_for" ||
    state === "delegated"
  )
    return "waiting";
  if (state === "dropped" || state === "cancelled") return "dropped";
  if (state === "done" || state === "archived" || status === "done" || status === "archived")
    return "done";
  return "inbox";
}

export function normalizeGTDState(thing: ThingStateSource): CanonicalGTDState {
  return normalizeGtdStateValue(thing.metadata?.gtd_state, thing.status);
}

export function formatTime(ms?: number) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function generateAiPrompt(thing: ThingStateSource) {
  return `I'm working on: "${thing.title || "Untitled"}"
First action was: "${thing.metadata?.first_physical_action || "not set"}"
I've spent ${formatTime(thing.metadata?.total_run_time_ms)} on this and I'm stuck.
Help me break this down into the smallest possible next step.`;
}

export function buildThingStatePatch(
  thing: ThingStateSource,
  nextState: CanonicalGTDState,
  metadataPatch: Record<string, unknown> = {},
) {
  const currentState = normalizeGTDState(thing);
  const now = new Date().toISOString();
  const previous =
    currentState !== "done" && currentState !== "dropped"
      ? currentState
      : normalizeGtdStateValue(String(thing.metadata?.previous_gtd_state || "inbox"));

  let total_run_time_ms = Number(thing.metadata?.total_run_time_ms) || 0;
  if (currentState === "doing" && thing.metadata?.last_started_at) {
    const diff = new Date(now).getTime() - new Date(thing.metadata.last_started_at).getTime();
    total_run_time_ms += Math.max(0, diff);
  }

  const isArchivedState = nextState === "done" || nextState === "dropped";

  return {
    status: isArchivedState ? "archived" : "active",
    metadata: {
      gtd_state: nextState,
      previous_gtd_state: isArchivedState ? previous : thing.metadata?.previous_gtd_state,
      total_run_time_ms,
      ...(nextState === "doing" ? { last_started_at: now } : { last_started_at: null }),
      ...(nextState === "done" ? { completed_at: now } : {}),
      ...(nextState === "dropped" ? { dropped_at: now } : {}),
      ...metadataPatch,
    },
  };
}

export function restoreDoneState(thing: ThingStateSource): CanonicalGTDState {
  const previous = normalizeGtdStateValue(String(thing.metadata?.previous_gtd_state || "inbox"));
  return previous && previous !== "done" && previous !== "dropped" ? previous : "inbox";
}
