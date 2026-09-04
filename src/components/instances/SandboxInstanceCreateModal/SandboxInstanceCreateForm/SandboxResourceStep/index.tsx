import { InstanceComputeSpecSelect } from "@/components/instances/InstanceComputeSpecSelect";

export function SandboxResourceStep() {
  return <InstanceComputeSpecSelect field="compute_spec" profile="cpu" />;
}
