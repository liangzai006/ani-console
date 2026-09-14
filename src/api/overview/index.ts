import { coreRequest } from "@/api/request";
import type { ConsoleOverviewStatistics } from "./types";

const OVERVIEW_TIMEOUT_MS = 15_000;

export function getConsoleOverview(): Promise<ConsoleOverviewStatistics> {
  return coreRequest<ConsoleOverviewStatistics>("/overview", {
    method: "GET",
    timeout: OVERVIEW_TIMEOUT_MS,
  });
}

export type {
  ConsoleOverviewStatistics,
  InferenceServiceOverviewStatistics,
  InstanceOverviewStatistics,
  KnowledgeBaseOverviewStatistics,
  ModelOverviewStatistics,
} from "./types";
