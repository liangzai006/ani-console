import type { AsyncTask } from "@/api/tasks";
import type { CoreDevProfileInfo, CursorPageParams } from "@/api/types";

export type InstanceKind =
  | "vm"
  | "container"
  | "gpu_container"
  | "sandbox"
  | "batch_job"
  | "notebook"
  | "k8s_cluster"
  | "bare_metal"
  | "dpu_node";
export type InstanceState =
  | "pending"
  | "provisioning"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "failed"
  | "deleting"
  | "deleted";
export type SandboxNetworkEgressPolicy = "deny_all" | "allowlist" | "internet";

export interface SandboxConfig {
  runtime_class: string;
  template_id?: string;
  session_timeout: string;
  idle_timeout?: string;
  on_timeout?: "pause" | "kill";
  network_egress_policy?: SandboxNetworkEgressPolicy;
  egress_allowlist?: string[];
  env?: Array<{ name: string; value?: string | null; secret_ref?: string | null }>;
  initial_ports?: Array<{ name?: string | null; container_port: number; protocol?: "tcp" | "udp" }>;
}

export interface SandboxPort {
  port: number;
  name?: string | null;
  protocol: "tcp" | "http";
  status: "opening" | "available" | "closing" | "failed";
  preview_url: string | null;
  expires_at?: string | null;
  reason?: string | null;
}

export interface SandboxInstanceStatus {
  template_id?: string | null;
  runtime_class: string;
  session_timeout: string;
  idle_timeout?: string | null;
  remain_seconds?: number | null;
  idle_remain_seconds?: number | null;
  on_timeout?: "pause" | "kill" | null;
  network_egress_policy: SandboxNetworkEgressPolicy;
  egress_allowlist?: string[];
  ports?: SandboxPort[];
  env?: Array<{ name: string; secret_ref?: string | null }>;
  checkpoints?: Array<{
    id: string;
    name: string;
    status: "creating" | "available" | "restoring" | "failed" | "deleted";
  }>;
  files_summary?: { file_count?: number; total_size_bytes?: number };
  session_state: "pending" | "running" | "paused" | "expired" | "stopped";
  agent_ref?: string | null;
  stop_reason?: "TTL_EXPIRED" | "IDLE_EXPIRED" | "USER_REQUESTED" | "RUNTIME_FAILED" | null;
  connectivity?: { token_available?: boolean; ports_available?: boolean };
  dev_profile?: CoreDevProfileInfo;
}

export interface InstanceRecord {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  labels?: Record<string, string>;
  kind: InstanceKind;
  instance_type?: InstanceKind;
  state: InstanceState;
  reason?: string | null;
  status?: string | null;
  provider: string;
  dev_profile?: CoreDevProfileInfo;
  operation_id?: string | null;
  image?: {
    id?: string | null;
    ref?: string | null;
    digest?: string | null;
    name?: string | null;
    tag?: string | null;
    purpose?: string | null;
    architecture?: string | null;
  } | null;
  compute?: {
    cpu?: string | number | null;
    memory?: string | number | null;
    spec_id?: string | null;
    gpu_type?: string | null;
    gpu_shares?: number | null;
    gpu_mb_per_share?: number | null;
    availability_zone?: string | null;
    node_name?: string | null;
  } | null;
  network?: {
    vpc_id?: string | null;
    vpc_name?: string | null;
    subnet_id?: string | null;
    subnet_name?: string | null;
    private_ip?: string | null;
    security_groups?: Array<{ id: string; name?: string | null }>;
    endpoints?: Array<{
      name?: string | null;
      address: string;
      protocol?: string | null;
      port?: number | null;
    }>;
    load_balancer_refs?: string[];
  } | null;
  access?: {
    ssh_available?: boolean;
    console_available?: boolean;
    exec_available?: boolean;
    reason?: string | null;
  } | null;
  storage_attachments?: Array<{
    resource_type: string;
    resource_id: string;
    resource_name?: string | null;
    mount_path?: string | null;
    read_only?: boolean;
    status?: string | null;
    task_id?: string | null;
  }>;
  vpc_id?: string | null;
  subnet_id?: string | null;
  private_ip?: string | null;
  audit_id?: string | null;
  resource_refs?: string[];
  endpoint?: string | null;
  node_name?: string | null;
  termination_protection: boolean;
  ssh?: {
    username: string;
    host: string | null;
    port: number;
    key_ref?: string | null;
    ready: boolean;
    reason?: string | null;
  } | null;
  volumes?: Array<{
    name: string;
    kind: "root_disk" | "data_disk" | "cdrom" | "shared_pvc" | "object_fuse" | "ephemeral";
    size_gib?: number;
    source_ref?: string | null;
    mount_path?: string | null;
    read_only: boolean;
  }>;
  container?: {
    replicas: number;
    ready_replicas: number;
    revision?: string | null;
    rollout_status?: "pending" | "progressing" | "healthy" | "degraded" | "rolled_back" | null;
    history?: Array<{ revision: string; image?: string | null; created_at: string }>;
  } | null;
  gpu?: {
    vendor?: string | null;
    model?: string | null;
    count?: number;
    spec_id?: string | null;
    gpu_type?: string | null;
    shares?: number | null;
    mb_per_share?: number | null;
    scheduling_reason?: string | null;
    utilization_percent?: number | null;
  } | null;
  sandbox?: SandboxInstanceStatus | null;
  workload_identity?: {
    key_id?: string | null;
    key_prefix?: string | null;
    scopes?: string[];
    active: boolean;
    created_at?: string | null;
    revoked_at?: string | null;
  };
  snapshots?: Array<{
    id: string;
    name: string;
    source_instance_id: string;
    state: "creating" | "ready" | "failed" | "deleting" | "deleted";
    reason?: string | null;
    created_at: string;
    ready_at?: string | null;
  }>;
  created_at: string;
  updated_at: string;
}

export interface InstanceListParams extends CursorPageParams {
  kind?: string;
  status?: string;
  search_field?: "name" | "id";
  keyword?: string;
  mountable?: boolean;
  vpc_id?: string;
  subnet_id?: string;
}
export interface InstanceListResponse {
  items: InstanceRecord[];
  total: number;
  next_cursor?: string | null;
}

export interface CreateInstanceInput {
  name: string;
  kind: "vm" | "container" | "gpu_container" | "sandbox";
  instance_type?: "vm" | "container" | "gpu_container" | "sandbox";
  image?: string | null;
  image_ref?: string | null;
  cpu?: string;
  memory?: string;
  auto_start?: boolean;
  boot_image?: string | null;
  boot_media?: { type: "iso" | "disk_image"; image_id?: string; boot_order: number } | null;
  root_disk_size_gib?: number | null;
  ssh_username?: string | null;
  ssh_key_ref?: string | null;
  command?: string[] | null;
  args?: string[] | null;
  termination_protection?: boolean;
  network?: {
    vpc_id?: string | null;
    subnet_id?: string | null;
    private_ip?: string | null;
  } | null;
  gpu?: { vendor?: string; model?: string; count: number } | null;
  replicas?: number;
  sandbox_config?: SandboxConfig;
  vm_config?: Record<string, unknown>;
  container_config?: Record<string, unknown>;
  gpu_config?: Record<string, unknown>;
  gpu_container_config?: Record<string, unknown>;
}
export type CreateInstanceRequest = CreateInstanceInput & { idempotency_key: string };
export interface CreateInstanceResponse {
  instance: InstanceRecord;
  operation_id: string;
  audit_id?: string | null;
}

export type InstanceLifecycleAction =
  | "start"
  | "stop"
  | "restart"
  | "resize"
  | "rebuild"
  | "delete"
  | "snapshot"
  | "attach_volume"
  | "detach_volume"
  | "attach_filesystem"
  | "detach_filesystem"
  | "rollback"
  | "scale"
  | "update_image"
  | "bind_secret"
  | "unbind_secret"
  | "change_security_groups"
  | "set_termination_protection"
  | "pause"
  | "resume"
  | "extend"
  | "touch_idle";
export interface InstanceLifecycleInput {
  action: InstanceLifecycleAction;
  cpu?: string | null;
  memory?: string | null;
  spec_id?: string | null;
  snapshot_name?: string | null;
  snapshot_id?: string | null;
  include_data_disks?: boolean | null;
  revision?: string | null;
  volume_id?: string | null;
  filesystem_id?: string | null;
  mount_path?: string | null;
  read_only?: boolean | null;
  replicas?: number | null;
  image_id?: string | null;
  strategy?: string | null;
  secret_id?: string | null;
  binding_type?: "env" | "file" | null;
  env_name?: string | null;
  security_group_ids?: string[] | null;
  enabled?: boolean | null;
  duration?: string | null;
}
export type InstanceLifecycleRequest = InstanceLifecycleInput & { idempotency_key: string };
export interface InstanceLifecycleResponse {
  instance: InstanceRecord;
  operation_id: string;
}

export interface InstanceOperation {
  id: string;
  instance_id: string;
  tenant_id: string;
  operation: string;
  status: "accepted" | "in_progress" | "succeeded" | "failed" | "cancelled";
  idempotency_key?: string | null;
  requested_by: string;
  precheck_result?: Record<string, unknown> | null;
  failure_reason?: string | null;
  failure_message?: string | null;
  retry_eligible: boolean;
  steps?: Array<{
    step_name: string;
    status: "pending" | "running" | "succeeded" | "failed" | "skipped";
    message?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
  }>;
  before_spec?: Record<string, unknown> | null;
  after_spec?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
}
export interface InstanceOperationListResponse {
  items: InstanceOperation[];
  total: number;
  next_cursor?: string | null;
}
export interface InstanceEvent {
  id: string;
  instance_id: string;
  type: "Normal" | "Warning";
  reason: string;
  message: string;
  count?: number;
  occurred_at: string;
}
export interface InstanceMetrics {
  instance_id: string;
  timestamp: string;
  cpu_utilization_pct?: number | null;
  memory_used_mb?: number | null;
  memory_total_mb?: number | null;
  gpu_utilization_pct?: number | null;
  gpu_memory_used_mb?: number | null;
  gpu_memory_total_mb?: number | null;
  network_rx_bytes?: number | null;
  network_tx_bytes?: number | null;
  dev_profile: CoreDevProfileInfo;
}
export interface InstanceSecurityEvent {
  id: string;
  instance_id: string;
  event_type: string;
  severity: "info" | "warning" | "critical";
  description?: string | null;
  occurred_at: string;
}
export interface ObservabilityRangeQueryResponse {
  query: string;
  result_type: "vector" | "matrix" | "scalar" | "string";
  results: Array<{
    metric: Record<string, string>;
    values: Array<{ timestamp: string; value: number }>;
  }>;
  dev_profile: CoreDevProfileInfo;
}
export interface InstanceExecSession {
  id: string;
  instance_id: string;
  ws_url: string;
  token?: string;
  expires_at: string;
  dev_profile: CoreDevProfileInfo;
}
export interface CreateInstanceExecSessionInput {
  container?: string | null;
  command: string[];
  tty: boolean;
  rows: number;
  cols: number;
}
export interface InstanceConsoleSession {
  operation_id?: string | null;
  session_id: string;
  protocol: "console" | "vnc" | "novnc" | "serial";
  connect_url: string;
  url: string;
  token?: string;
  expires_at: string;
}
export interface SandboxTemplate {
  id: string;
  name: string;
  image: string;
  description?: string | null;
  cpu_cores?: number | null;
  memory_gb?: number | null;
  storage_gb?: number | null;
  is_builtin: boolean;
  created_at: string;
  dev_profile: CoreDevProfileInfo;
}
export interface SandboxTokenResponse {
  token: string;
  expires_at: string;
  scopes: Array<"connect" | "exec" | "files" | "ports">;
}
export interface SandboxFile {
  path: string;
  kind: "file" | "directory";
  size_bytes: number;
  updated_at: string;
}
export interface SandboxCheckpoint {
  id: string;
  name: string;
  status: "creating" | "available" | "restoring" | "failed" | "deleted";
  keep_memory: boolean;
  created_at: string;
  size_bytes?: number | null;
  reason?: string | null;
}
export interface SandboxCodeRun {
  id: string;
  status: "accepted" | "running" | "succeeded" | "failed" | "timed_out";
  language: "python" | "javascript";
  stdout?: string | null;
  stderr?: string | null;
  exit_code?: number | null;
  truncated: boolean;
  created_at: string;
  completed_at?: string | null;
}
export type SandboxCodeRunTask = AsyncTask;
