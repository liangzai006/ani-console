import { Alert, Form, Input, Select, Tag } from "@arco-design/web-react";
import { InstanceComputeSpecSelect } from "@/components/instances/InstanceComputeSpecSelect";
import { type FormValues, type GpuSpecOption, isGpuSpecSelectable } from "../../types";

function specStatusTag(spec: GpuSpecOption) {
  if (spec.source === "temporary") {
    return <Tag color="blue">{spec.gpu_mode === "wholecard" ? "整卡" : "vGPU"}</Tag>;
  }

  switch (spec.availability?.status) {
    case "available":
      return <Tag color="green">剩余 {spec.availability.available_count}</Tag>;
    case "full":
      return <Tag color="gray">配额已满</Tag>;
    case "device_full":
      return <Tag color="orange">设备已满</Tag>;
    case "unavailable":
      return <Tag color="gray">暂无匹配节点</Tag>;
  }
}

export function GpuResourceStep({
  values,
  specs,
  quotaRemaining,
  specsLoading,
  specsError,
  usingTemporarySpecs,
}: {
  values: FormValues;
  specs: GpuSpecOption[];
  quotaRemaining: number;
  specsLoading: boolean;
  specsError: boolean;
  usingTemporarySpecs: boolean;
}) {
  const selectedSpec = specs.find((item) => item.spec_id === values.spec_id);
  return (
    <>
      {usingTemporarySpecs ? (
        <Alert
          type="info"
          showIcon
          content="GPU 规格接口当前暂无数据，暂提供 RTX 4090 整卡与 vGPU 选项；接口返回规格后将自动切换。"
          className="mb-4"
        />
      ) : null}
      {!specsLoading && !specsError && !specs.some(isGpuSpecSelectable) ? (
        <Alert type="warning" showIcon content="当前没有可创建的 GPU 规格" className="mb-4" />
      ) : null}
      <Form.Item
        field="spec_id"
        label="GPU 规格"
        rules={[{ required: true, message: "请选择 GPU 规格" }]}
      >
        <Select loading={specsLoading} placeholder="请选择可用 GPU 规格" showSearch allowClear>
          {specs.map((spec) => (
            <Select.Option
              key={spec.spec_id}
              value={spec.spec_id}
              disabled={!isGpuSpecSelectable(spec)}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span>{spec.display_name}</span>
                {specStatusTag(spec)}
              </span>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      {selectedSpec ? (
        <Alert
          type="info"
          showIcon
          content={
            selectedSpec.source === "temporary"
              ? `已选 ${selectedSpec.display_name}，提交规格 ${selectedSpec.spec_id}`
              : `已选规格 ${selectedSpec.spec_id}，单副本占用 ${selectedSpec.availability?.gpu_count ?? 1} 卡，当前剩余配额 ${quotaRemaining} 卡`
          }
          className="mb-4"
        />
      ) : null}
      <InstanceComputeSpecSelect field="compute_spec" profile="gpu" />
      <Form.Item
        field="replicas"
        label="副本"
        rules={[
          {
            required: true,
            match: /^[1-9]\d*$/,
            message: "请输入大于 0 的整数",
          },
        ]}
      >
        <Input placeholder="1" />
      </Form.Item>
    </>
  );
}
