import { Form, Select, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { coreApi } from "@/api/client";
import type { components } from "@/api/core-schema";
import { StatusTag } from "@/components/common";
import { InstanceComputeSpecSelect } from "@/components/instances/InstanceComputeSpecSelect";
import { getErrorMessage } from "@/lib/errors";
import { GPU_INSTANCE_COMPUTE_SPECS } from "@/lib/instance-compute-specs";
import { currentCpuMemorySpec, currentGpuSpecValue } from "./helpers";

type Instance = components["schemas"]["InstanceRecord"];

type GpuSpecAvailability = {
  spec_id: string;
  status: "available" | "full" | "device_full" | "unavailable";
  available_count: number;
};

type GpuSpecAvailabilityListResponse = {
  items: GpuSpecAvailability[];
};

export function GpuInstanceResizeFields({
  instance,
  enabled,
}: {
  instance: Instance;
  enabled: boolean;
}) {
  const gpuSpecs = useQuery({
    queryKey: ["gpu-specs", "availability", "resize", instance.id],
    enabled,
    queryFn: async () => {
      const request = coreApi.GET as unknown as (path: string) => Promise<{
        data?: GpuSpecAvailabilityListResponse;
        error?: unknown;
      }>;
      const { data, error } = await request("/gpu-specs/availability");
      if (error || !data) {
        throw error ?? new Error("GPU 规格可用性未返回结果");
      }
      return data;
    },
  });
  const currentCpuSpec = currentCpuMemorySpec(instance);
  const currentGpuValue = currentGpuSpecValue(instance);
  const currentGpuLabel = instance.compute?.gpu_type ?? instance.compute?.spec_id ?? "-";
  const cpuOptions = GPU_INSTANCE_COMPUTE_SPECS.some((option) => option.value === currentCpuSpec)
    ? GPU_INSTANCE_COMPUTE_SPECS.map((option) => ({
        label: `${option.value}${option.value === currentCpuSpec ? "（当前）" : ""}`,
        value: option.value,
      }))
    : [
        { label: `${currentCpuSpec}（当前）`, value: currentCpuSpec },
        ...GPU_INSTANCE_COMPUTE_SPECS.map((option) => ({
          label: option.value,
          value: option.value,
        })),
      ];
  const apiGpuOptions = (gpuSpecs.data?.items ?? []).map((spec) => ({
    label: `${spec.spec_id}${spec.spec_id === currentGpuValue ? "（当前）" : ""}`,
    value: spec.spec_id,
    disabled:
      spec.spec_id !== currentGpuValue &&
      (spec.status !== "available" || spec.available_count <= 0),
  }));
  const gpuOptions = apiGpuOptions.some((option) => option.value === currentGpuValue)
    ? apiGpuOptions
    : [
        {
          label: `${currentGpuLabel}（当前）`,
          value: currentGpuValue,
          disabled: false,
        },
        ...apiGpuOptions,
      ];

  return (
    <>
      <Typography.Paragraph className="mb-4">
        当前 <StatusTag status={instance.state} /> ·{" "}
        <Typography.Text bold>
          {currentGpuLabel} · {currentCpuSpec}
        </Typography.Text>
        。变配只改单副本规格，不改副本数（改副本请用扩缩容）。须先停止。
      </Typography.Paragraph>
      <Form.Item
        field="gpu_spec_id"
        label="GPU 规格"
        extra={gpuSpecs.error ? getErrorMessage(gpuSpecs.error, "GPU 规格加载失败") : undefined}
        rules={[{ required: true, message: "请选择 GPU 规格" }]}
      >
        <Select loading={gpuSpecs.isLoading} options={gpuOptions} placeholder="请选择 GPU 规格" />
      </Form.Item>
      <InstanceComputeSpecSelect
        field="cpu_memory_spec"
        profile="gpu"
        placeholder="请选择 CPU / 内存"
        options={cpuOptions}
      />
      <Typography.Paragraph type="secondary" className="mb-0">
        提交后写入生命周期任务，实例保持已停止；启动后按新规格调度。
      </Typography.Paragraph>
    </>
  );
}
