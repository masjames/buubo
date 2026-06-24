export type ThingStatus = 'active' | 'done' | 'archived';
export type ThingKind = 'raw' | 'task' | 'idea' | 'worry' | 'thought' | 'question' | 'reminder';

export interface Thing {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  source: string | null;
  kind: ThingKind;
  status: ThingStatus;
  idempotency_key: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export type DecisionStatus = 'open' | 'locked' | 'postponed' | 'killed';

export interface Decision {
  id: string;
  user_id: string;
  title: string;
  statement: string | null;
  rationale: string | null;
  status: DecisionStatus;
  related_thing_ids: string[];
  metadata: Record<string, any>;
  created_at: string;
  locked_at: string | null;
  updated_at: string;
}

export interface Reflection {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  wins: string | null;
  problems: string | null;
  ideas: string | null;
  worked: string | null;
  drained: string | null;
  tomorrow_one_thing: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type RunStatus = 'created' | 'queued' | 'running' | 'waiting_approval' | 'done' | 'failed' | 'cancelled';
export type RiskLevel = 'safe' | 'medium' | 'dangerous';
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export interface Run {
  id: string;
  user_id: string;
  title: string;
  request: string | null;
  source: string | null;
  executor: string | null;
  status: RunStatus;
  current_step: string | null;
  risk_level: RiskLevel;
  requires_approval: boolean;
  approval_status: ApprovalStatus;
  result_summary: string | null;
  artifact_links: string[];
  failed_reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
