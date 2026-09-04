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

export type ComputeInstanceDetailTabKey =
  (typeof computeInstanceDetailTabKeys)[number];

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

export type ContainerInstanceDetailTabKey =
  (typeof containerInstanceDetailTabKeys)[number];

export const gpuInstanceDetailTabKeys = [
  "releases",
  "configuration",
  "storage",
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

export type SandboxInstanceDetailTabKey =
  (typeof sandboxInstanceDetailTabKeys)[number];
