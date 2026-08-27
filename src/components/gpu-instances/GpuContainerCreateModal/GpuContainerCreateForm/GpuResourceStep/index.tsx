import { Form, Input, Select } from "@arco-design/web-react";
import { COMPUTE_SPEC_OPTIONS, GPU_SPEC_OPTIONS } from "../../types";

export function GpuResourceStep() {
  return (
    <>
      <Form.Item
        field="gpu_spec"
        label="GPU 规格与调度"
        rules={[{ required: true }]}
      >
        <Select
          options={GPU_SPEC_OPTIONS.map(({ key, label }) => ({
            value: key,
            label,
          }))}
        />
      </Form.Item>
      <Form.Item field="compute_spec" label="CPU / 内存">
        <Select
          options={COMPUTE_SPEC_OPTIONS.map(({ key, label }) => ({
            value: key,
            label,
          }))}
        />
      </Form.Item>
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
