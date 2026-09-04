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
} as const satisfies Partial<
  Record<ComputeSpecLabel, { cpu: string; memory: string }>
>;

export type InstanceComputeSpecValue =
  keyof typeof INSTANCE_COMPUTE_SPEC_CATALOG;

export type InstanceComputeSpec<
  TValue extends InstanceComputeSpecValue = InstanceComputeSpecValue,
> = {
  value: TValue;
  label: TValue;
  cpu: string;
  memory: string;
};

function defineComputeSpecs<
  const TValues extends readonly InstanceComputeSpecValue[],
>(values: TValues): ReadonlyArray<InstanceComputeSpec<TValues[number]>> {
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

export type CpuInstanceComputeSpec =
  (typeof CPU_INSTANCE_COMPUTE_SPECS)[number]["value"];

export const DEFAULT_CPU_INSTANCE_COMPUTE_SPEC =
  CPU_INSTANCE_COMPUTE_SPECS[1].value;

export const GPU_INSTANCE_COMPUTE_SPECS = defineComputeSpecs([
  "4C16G",
  "8C32G",
  "16C64G",
  "32C128G",
] as const);

export type GpuInstanceComputeSpec =
  (typeof GPU_INSTANCE_COMPUTE_SPECS)[number]["value"];

export const DEFAULT_GPU_INSTANCE_COMPUTE_SPEC =
  GPU_INSTANCE_COMPUTE_SPECS[0].value;

export const INSTANCE_COMPUTE_SPEC_BY_VALUE = INSTANCE_COMPUTE_SPEC_CATALOG;
