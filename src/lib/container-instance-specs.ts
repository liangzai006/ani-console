export const CONTAINER_CPU_MEMORY_SPECS = [
  { value: "1C2G", cpu: "1", memory: "2Gi" },
  { value: "2C4G", cpu: "2", memory: "4Gi" },
  { value: "4C8G", cpu: "4", memory: "8Gi" },
  { value: "8C16G", cpu: "8", memory: "16Gi" },
] as const;

export type ContainerCpuMemorySpec =
  (typeof CONTAINER_CPU_MEMORY_SPECS)[number]["value"];
