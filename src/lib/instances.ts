import type { InstanceRecord } from "@/api/instances";
import type { NavigateFn } from "@tanstack/react-router";

type ComputeSpecLabel = `${number}C${number}G`;

const INSTANCE_COMPUTE_SPEC_CATALOG = {
  "1C2G": { cpu: "1", memory: "2Gi" },
  "2C4G": { cpu: "2", memory: "4Gi" },
  "4C8G": { cpu: "4", memory: "8Gi" },
  "4C16G": { cpu: "4", memory: "16Gi" },
  "8C16G": { cpu: "8", memory: "16Gi" },
  "8C32G": { cpu: "8", memory: "32Gi" },
  "16C64G": { cpu: "16", memory: "64Gi" },
  "32C128G": { cpu: "32", memory: "128Gi" },
} as const satisfies Partial<Record<ComputeSpecLabel, { cpu: string; memory: string }>>;

export type InstanceComputeSpecValue = keyof typeof INSTANCE_COMPUTE_SPEC_CATALOG;

export type InstanceComputeSpec<
  TValue extends InstanceComputeSpecValue = InstanceComputeSpecValue,
> = {
  value: TValue;
  label: TValue;
  cpu: string;
  memory: string;
};

function defineComputeSpecs<const TValues extends readonly InstanceComputeSpecValue[]>(
  values: TValues,
): ReadonlyArray<InstanceComputeSpec<TValues[number]>> {
  return values.map((value) => ({
    value,
    label: value,
    ...INSTANCE_COMPUTE_SPEC_CATALOG[value],
  }));
}

export const CPU_INSTANCE_COMPUTE_SPECS = defineComputeSpecs([
  "1C2G",
  "2C4G",
  "4C8G",
  "8C16G",
  "16C64G",
] as const);

export type CpuInstanceComputeSpec = (typeof CPU_INSTANCE_COMPUTE_SPECS)[number]["value"];

export const DEFAULT_CPU_INSTANCE_COMPUTE_SPEC = CPU_INSTANCE_COMPUTE_SPECS[1].value;

export const GPU_INSTANCE_COMPUTE_SPECS = defineComputeSpecs([
  "4C16G",
  "8C32G",
  "16C64G",
  "32C128G",
] as const);

export type GpuInstanceComputeSpec = (typeof GPU_INSTANCE_COMPUTE_SPECS)[number]["value"];

export const DEFAULT_GPU_INSTANCE_COMPUTE_SPEC = GPU_INSTANCE_COMPUTE_SPECS[0].value;

export const INSTANCE_COMPUTE_SPEC_BY_VALUE = INSTANCE_COMPUTE_SPEC_CATALOG;

export const computeInstanceDetailTabKeys = [
  "ssh",
  "storage",
  "network",
  "monitoring",
  "logs",
  "events",
  "operations",
  "terminal",
] as const;

export type ComputeInstanceDetailTabKey = (typeof computeInstanceDetailTabKeys)[number];

export const containerInstanceDetailTabKeys = [
  "release",
  "configuration",
  "storage",
  "network",
  "monitoring",
  "logs",
  "events",
  "terminal",
  "operations",
] as const;

export type ContainerInstanceDetailTabKey = (typeof containerInstanceDetailTabKeys)[number];

export const gpuInstanceDetailTabKeys = [
  "releases",
  "configuration",
  "storage",
  "gpu-metrics",
  "network",
  "monitoring",
  "logs",
  "events",
  "terminal",
  "operations",
] as const;

export type GpuInstanceDetailTabKey = (typeof gpuInstanceDetailTabKeys)[number];

export const sandboxInstanceDetailTabKeys = [
  "access",
  "env",
  "terminal",
  "code",
  "files",
  "checkpoints",
  "metrics",
  "logs",
  "events",
  "security",
  "operations",
] as const;

export type SandboxInstanceDetailTabKey = (typeof sandboxInstanceDetailTabKeys)[number];

type Instance = Pick<InstanceRecord, "id" | "kind">;

export function navigateToInstanceDetail(navigate: NavigateFn, instance: Instance) {
  if (instance.kind === "vm") {
    void navigate({
      to: "/vm-instances/$instanceId",
      params: { instanceId: instance.id },
    });
    return;
  }
  if (instance.kind === "container") {
    void navigate({
      to: "/container-instances/$instanceId",
      params: { instanceId: instance.id },
    });
    return;
  }
  if (instance.kind === "gpu_container") {
    void navigate({
      to: "/gpu-instances/$instanceId",
      params: { instanceId: instance.id },
    });
    return;
  }
  if (instance.kind === "sandbox") {
    void navigate({
      to: "/sandbox-instances/$instanceId",
      params: { instanceId: instance.id },
    });
  }
}

type NetworkishRecord = Record<string, unknown>;

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNestedString(
  record: NetworkishRecord,
  objectKey: string,
  fieldKey: string,
): string | undefined {
  const nested = record[objectKey];
  if (!nested || typeof nested !== "object") return undefined;
  return readString((nested as NetworkishRecord)[fieldKey]);
}

export function getInstanceNetworkValue(instance: unknown, field: "vpc_id" | "subnet_id"): string {
  if (!instance || typeof instance !== "object") return "-";
  const record = instance as NetworkishRecord;
  return readString(record[field]) ?? readNestedString(record, "network", field) ?? "-";
}

export function getInstanceDisplayIp(instance: unknown): string {
  if (!instance || typeof instance !== "object") return "-";
  const record = instance as NetworkishRecord;
  return (
    readString(record.private_ip) ??
    readNestedString(record, "network", "private_ip") ??
    readString(record.ip_address) ??
    readString(record.endpoint) ??
    readNestedString(record, "ssh", "host") ??
    "-"
  );
}

type ProviderLike = {
  provider?: string | null;
  dev_profile?: {
    mode?: string | null;
    provider?: string | null;
    real_provider?: boolean | null;
  } | null;
};

export function parseSandboxCommand(value: string): string[] | undefined {
  const input = value.trim();
  if (!input) return undefined;

  const parts: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaping) current += "\\";
  if (current) parts.push(current);
  return parts.length ? parts : undefined;
}

export function getSandboxProviderLabel(instance: ProviderLike): string {
  const provider = instance.provider ?? instance.dev_profile?.provider ?? "-";
  const realProvider = instance.dev_profile?.real_provider;

  if (instance.dev_profile?.mode === "local") return "本地开发模式";
  if (realProvider === true && provider === "kubernetes_rest") return "真实 Kubernetes/Kata 后端";
  if (realProvider === false && provider !== "-") return `${provider}（real_provider=false）`;
  return provider;
}
