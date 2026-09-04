import { Form, Select } from "@arco-design/web-react";
import type { ReactNode } from "react";
import {
  CPU_INSTANCE_COMPUTE_SPECS,
  GPU_INSTANCE_COMPUTE_SPECS,
} from "@/lib/instance-compute-specs";

type ComputeSpecOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

type Props = {
  field: string;
  profile: "cpu" | "gpu";
  options?: readonly ComputeSpecOption[];
  label?: ReactNode;
  placeholder?: string;
};

const PROFILE_OPTIONS = {
  cpu: CPU_INSTANCE_COMPUTE_SPECS,
  gpu: GPU_INSTANCE_COMPUTE_SPECS,
} satisfies Record<Props["profile"], readonly ComputeSpecOption[]>;

export function InstanceComputeSpecSelect({
  field,
  profile,
  options = PROFILE_OPTIONS[profile],
  label = "CPU / 内存",
  placeholder = "请选择 CPU / 内存规格",
}: Props) {
  return (
    <Form.Item
      field={field}
      label={label}
      rules={[{ required: true, message: placeholder }]}
    >
      <Select placeholder={placeholder} options={options.map((item) => item)} />
    </Form.Item>
  );
}
