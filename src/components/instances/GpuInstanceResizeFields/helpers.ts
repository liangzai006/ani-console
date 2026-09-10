import type { InstanceRecord } from "@/api/instances";
import { GPU_INSTANCE_COMPUTE_SPECS } from "@/lib/instance-compute-specs";

type Instance = InstanceRecord;

export const CURRENT_GPU_SPEC_VALUE = "__current_gpu_spec__";

export type GpuInstanceResizeFormValues = {
  gpu_spec_id?: string;
  cpu_memory_spec?: string;
};

export function currentCpuMemorySpec(instance: Instance) {
  const cpu = String(instance.compute?.cpu ?? "").replace(/C$/i, "");
  const memory = String(instance.compute?.memory ?? "");
  if (!cpu || !memory) return GPU_INSTANCE_COMPUTE_SPECS[0].value;

  return `${cpu}C${memory.replace(/Gi$/i, "G")}`;
}

export function currentGpuSpecValue(instance: Instance) {
  return instance.compute?.spec_id || CURRENT_GPU_SPEC_VALUE;
}

export function getGpuInstanceResizeInitialValues(instance: Instance): GpuInstanceResizeFormValues {
  return {
    gpu_spec_id: currentGpuSpecValue(instance),
    cpu_memory_spec: currentCpuMemorySpec(instance),
  };
}

export function buildGpuInstanceResizeFields(values: GpuInstanceResizeFormValues) {
  const cpuSpec = GPU_INSTANCE_COMPUTE_SPECS.find(
    (option) => option.value === values.cpu_memory_spec,
  );
  const [cpu, memory] = values.cpu_memory_spec?.match(/^(\d+)C(\d+)G$/i)?.slice(1) ?? [];

  return {
    cpu: cpuSpec?.cpu ?? cpu,
    memory: cpuSpec?.memory ?? (memory ? `${memory}Gi` : undefined),
    spec_id: values.gpu_spec_id === CURRENT_GPU_SPEC_VALUE ? undefined : values.gpu_spec_id,
  };
}

export function isGpuInstanceResizeUnchanged(
  instance: Instance,
  values: GpuInstanceResizeFormValues,
) {
  const initialValues = getGpuInstanceResizeInitialValues(instance);
  return (
    values.gpu_spec_id === initialValues.gpu_spec_id &&
    values.cpu_memory_spec === initialValues.cpu_memory_spec
  );
}
