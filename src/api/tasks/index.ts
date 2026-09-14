import { coreRequest } from "@/api/request";
import type { AsyncTask, TaskListParams, TaskListResponse } from "./types";

export function listTasks(params: TaskListParams = {}): Promise<TaskListResponse> {
  return coreRequest<TaskListResponse>("/tasks", { method: "GET", params });
}

export function getTask(taskId: string): Promise<AsyncTask> {
  return coreRequest<AsyncTask>(`/tasks/${encodeURIComponent(taskId)}`, { method: "GET" });
}

export type { AsyncTask, AsyncTaskStatus, TaskListParams, TaskListResponse } from "./types";
