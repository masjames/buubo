import type { CanonicalGTDState, LocalGTDState } from "@/shared/viga-state";

export type ThingMetadata = {
  gtd_state?: LocalGTDState;
  previous_gtd_state?: LocalGTDState | CanonicalGTDState;
  is_urgent?: boolean;
  active_loop_since?: string;
  undecided_since?: string;
  completed_at?: string;
  dropped_at?: string;
  cancelled_at?: string;
  total_run_time_ms?: number;
  last_started_at?: string | null;
  proof_text?: string;
  drop_reason?: string;
  stuck_exit?: string;
  ai_prompt_text?: string;
  first_physical_action?: string;
  [key: string]: unknown;
};

export type Thing = {
  id: string;
  title: string;
  body?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: ThingMetadata;
  is_pending?: boolean;
};
