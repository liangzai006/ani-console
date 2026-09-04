import {
  DEFAULT_GPU_INSTANCE_COMPUTE_SPEC,
  GPU_INSTANCE_COMPUTE_SPECS,
  type GpuInstanceComputeSpec,
} from "@/lib/instance-compute-specs";

export type FormValues = {
  name: string;
  image: string;
  spec_id: string;
  queue_name: string;
  compute_spec: GpuInstanceComputeSpec;
  replicas: string;
  vpc_id: string;
  subnet_id: string;
  env_text: string;
  mount_path: string;
  filesystem_id: string;
  auto_start: boolean;
};

export type RegistryImage = {
  image: string;
  name?: string | null;
  purpose?: string;
  project: string;
  repository: string;
  tag: string;
  size_bytes?: number;
};

export type Filesystem = {
  id: string;
  name?: string;
  size_gib?: number;
  protocol?: string;
};

export type GpuSpecAvailability = {
  spec_id: string;
  status: "available" | "full" | "device_full" | "unavailable";
  available_count: number;
  has_matching_nodes: boolean;
  has_idle_devices: boolean;
  device_idle_count: number;
  gpu_count?: number;
};

export type GpuSpecAvailabilityListResponse = {
  items: GpuSpecAvailability[];
  quota_remaining: number;
};

export type GpuSpecOption = {
  spec_id: string;
  display_name: string;
  gpu_type?: string;
  gpu_mode?: "wholecard" | "vgpu";
  shares?: number;
  source: "api" | "temporary";
  availability?: GpuSpecAvailability;
};

// TODO: /gpu-specs/availability 返回真实规格后删除临时选项，完全迁移到接口数据。
export const TEMPORARY_RTX4090_GPU_SPEC_OPTIONS: GpuSpecOption[] = [
  {
    spec_id: "rtx-4090-48g-1",
    display_name: "RTX 4090 · 整卡",
    gpu_type: "NVIDIA-GeForce-RTX-4090",
    gpu_mode: "wholecard",
    shares: 1,
    source: "temporary",
  },
  {
    spec_id: "rtx4090-12g-4",
    display_name: "RTX 4090 · vGPU（4 份）",
    gpu_type: "NVIDIA-GeForce-RTX-4090",
    gpu_mode: "vgpu",
    shares: 4,
    source: "temporary",
  },
];

export function isGpuSpecSelectable(spec: GpuSpecOption) {
  // TODO(gpu-spec-quota): 租户配额校验修复后，删除 full 分支并恢复仅 available 可选。
  if (spec.availability?.status === "full") return true;

  return (
    spec.source === "temporary" ||
    (spec.availability?.status === "available" &&
      spec.availability.available_count > 0)
  );
}

export type GpuSchedulingQueue = {
  id: string;
  name: string;
  workload_class: "inference" | "training" | "batch";
  is_platform_default: boolean;
  status?: {
    state?: "open" | "closed" | "unknown";
  } | null;
};

export type GpuSchedulingQueueListResponse = {
  items: GpuSchedulingQueue[];
  total: number;
  next_cursor?: string | null;
};

export type ExtendedCreateRequest = {
  idempotency_key: string;
  name: string;
  kind: "gpu_container";
  instance_type: "gpu_container";
  image: string;
  image_ref: string;
  cpu: string;
  memory: string;
  auto_start: boolean;
  termination_protection: boolean;
  gpu_container_config: {
    network: {
      vpc_id: string;
      subnet_id: string;
      security_group_ids: string[];
    };
    replicas: number;
    gpu: {
      spec_id: string;
      queue_name: string;
    };
    env: Array<{ name: string; value: string }>;
    filesystem_mounts: Array<{
      filesystem_id: string;
      mount_path: string;
      read_only: boolean;
    }>;
  };
};

export const INITIAL_VALUES: FormValues = {
  name: "",
  image: "",
  spec_id: "",
  queue_name: "",
  compute_spec: DEFAULT_GPU_INSTANCE_COMPUTE_SPEC,
  replicas: "1",
  vpc_id: "",
  subnet_id: "",
  env_text: "",
  mount_path: "",
  filesystem_id: "",
  auto_start: true,
};

function parseEnv(text: string) {
  return text
    .split(/\r?\n|\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separator = item.indexOf("=");
      return separator > 0
        ? { name: item.slice(0, separator), value: item.slice(separator + 1) }
        : null;
    })
    .filter((item): item is { name: string; value: string } => item !== null);
}

export function buildCreateRequest(
  values: FormValues,
  securityGroupId: string,
): Omit<ExtendedCreateRequest, "idempotency_key"> {
  const computeSpec =
    GPU_INSTANCE_COMPUTE_SPECS.find(
      (option) => option.value === values.compute_spec,
    ) ?? GPU_INSTANCE_COMPUTE_SPECS[0];
  return {
    name: values.name.trim(),
    kind: "gpu_container",
    instance_type: "gpu_container",
    image: values.image,
    image_ref: values.image,
    cpu: computeSpec.cpu,
    memory: computeSpec.memory,
    auto_start: values.auto_start,
    termination_protection: false,
    gpu_container_config: {
      network: {
        vpc_id: values.vpc_id,
        subnet_id: values.subnet_id,
        security_group_ids: securityGroupId ? [securityGroupId] : [],
      },
      replicas: Number(values.replicas) || 1,
      gpu: {
        spec_id: values.spec_id,
        queue_name: values.queue_name,
      },
      env: parseEnv(values.env_text),
      filesystem_mounts:
        values.filesystem_id && values.mount_path
          ? [
              {
                filesystem_id: values.filesystem_id,
                mount_path: values.mount_path,
                read_only: false,
              },
            ]
          : [],
    },
  };
}
