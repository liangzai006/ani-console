import { coreRequest } from "@/api/request";
import type { AsyncTask } from "./types";

export function getTask(taskId: string): Promise<AsyncTask> {
  return coreRequest<AsyncTask>(`/tasks/${encodeURIComponent(taskId)}`, { method: "GET" });
}

export type { AsyncTask, AsyncTaskStatus } from "./types";
