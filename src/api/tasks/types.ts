export type AsyncTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "dead_letter";

export interface AsyncTask {
  id: string;
  idempotency_key: string;
  task_type: string;
  resource_type?: string | null;
  resource_id?: string | null;
  status: AsyncTaskStatus;
  attempt_count?: number;
  max_attempts?: number;
  progress_pct?: number;
  result?: Record<string, unknown> | null;
  error_message?: string | null;
  dead_letter_at?: string | null;
  created_at: string;
  completed_at?: string | null;
}
