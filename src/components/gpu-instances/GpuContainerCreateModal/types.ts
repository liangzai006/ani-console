export const GPU_SPEC_OPTIONS = [
  {
    key: "nvidia-a100-whole-1",
    label: "A100×1 · 整卡",
    data: {
      vendor: "nvidia",
      model: "A100",
      count: 1,
      allocation_mode: "whole",
    },
  },
  {
    key: "nvidia-a10-whole-1",
    label: "A10×1 · 整卡",
    data: {
      vendor: "nvidia",
      model: "A10",
      count: 1,
      allocation_mode: "whole",
    },
  },
] as const;

export const COMPUTE_SPEC_OPTIONS = [
  { key: "cpu-4-memory-8gi", label: "4C8G", data: { cpu: "4", memory: "8Gi" } },
  {
    key: "cpu-8-memory-16gi",
    label: "8C16G",
    data: { cpu: "8", memory: "16Gi" },
  },
  {
    key: "cpu-16-memory-64gi",
    label: "16C64G",
    data: { cpu: "16", memory: "64Gi" },
  },
] as const;

export type GpuSpecKey = (typeof GPU_SPEC_OPTIONS)[number]["key"];
export type ComputeSpecKey = (typeof COMPUTE_SPEC_OPTIONS)[number]["key"];

export const GPU_SPEC_BY_KEY = Object.fromEntries(
  GPU_SPEC_OPTIONS.map((option) => [option.key, option]),
) as Record<GpuSpecKey, (typeof GPU_SPEC_OPTIONS)[number]>;

export const COMPUTE_SPEC_BY_KEY = Object.fromEntries(
  COMPUTE_SPEC_OPTIONS.map((option) => [option.key, option]),
) as Record<ComputeSpecKey, (typeof COMPUTE_SPEC_OPTIONS)[number]>;

export type FormValues = {
  name: string;
  image: string;
  gpu_spec: GpuSpecKey;
  compute_spec: ComputeSpecKey;
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
      vendor: string;
      model: string;
      count: number;
      allocation_mode: string;
      workload_class: string;
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
  gpu_spec: "nvidia-a100-whole-1",
  compute_spec: "cpu-4-memory-8gi",
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
  idempotencyKey: string,
): ExtendedCreateRequest {
  const computeSpec = COMPUTE_SPEC_BY_KEY[values.compute_spec].data;
  const gpuSpec = GPU_SPEC_BY_KEY[values.gpu_spec].data;
  return {
    idempotency_key: idempotencyKey,
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
        ...gpuSpec,
        workload_class: "gpu-container",
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
