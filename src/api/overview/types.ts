export interface InstanceOverviewStatistics {
  total: number;
  by_state: {
    pending: number;
    provisioning: number;
    starting: number;
    running: number;
    stopping: number;
    stopped: number;
    failed: number;
    deleting: number;
  };
}

export interface InferenceServiceOverviewStatistics {
  total: number;
  by_status: {
    pending: number;
    deploying: number;
    running: number;
    stopping: number;
    stopped: number;
    failed: number;
  };
}

export interface ModelOverviewStatistics {
  total: number;
  by_status: {
    pending: number;
    downloading: number;
    ready: number;
    error: number;
  };
}

export interface KnowledgeBaseOverviewStatistics {
  total: number;
  by_status: {
    active: number;
    rebuilding: number;
  };
}

export interface ConsoleOverviewStatistics {
  instances: InstanceOverviewStatistics;
  inference_services: InferenceServiceOverviewStatistics;
  models: ModelOverviewStatistics;
  knowledge_bases: KnowledgeBaseOverviewStatistics;
}
