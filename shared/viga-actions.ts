import type { CanonicalGTDState } from "./viga-state";

export type VigaSurface = "flow" | "things";
export type VigaAction =
  | CanonicalGTDState
  | "archive"
  | "restore"
  | "done"
  | "drop"
  | "stuck"
  | "pause"
  | "play";

export function getVisibleThingActions(state: CanonicalGTDState, surface: VigaSurface): VigaAction[] {
  if (state === "done" || state === "dropped") return ["restore"];

  if (surface === "flow") {
    if (state === "doing") return ["pause", "done", "drop", "stuck"];
    if (state === "next_action") return ["play", "done", "drop"];
    return [];
  }

  if (surface === "things") {
    if (state === "inbox") return ["next_action", "waiting", "archive"];
    if (state === "waiting") return ["doing", "next_action", "inbox", "archive"];
  }
  return [];
}
