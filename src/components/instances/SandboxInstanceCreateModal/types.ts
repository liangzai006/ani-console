import type {
  CreateInstanceInput,
  SandboxNetworkEgressPolicy,
  SandboxTemplate as ApiSandboxTemplate,
} from "@/api/instances";
import {
  CPU_INSTANCE_COMPUTE_SPECS,
  DEFAULT_CPU_INSTANCE_COMPUTE_SPEC,
  type CpuInstanceComputeSpec,
} from "@/lib/instance-compute-specs";

export type SandboxTemplate = ApiSandboxTemplate;
export type EgressPolicy = SandboxNetworkEgressPolicy;

export type FormValues = {
  name: string;
  template_id: string;
  compute_spec: CpuInstanceComputeSpec;
  session_timeout: string;
  idle_timeout: string;
  on_timeout: "pause" | "kill";
  egress_policy: EgressPolicy;
  egress_allowlist: string;
  auto_start: boolean;
};

export const INITIAL_VALUES: FormValues = {
  name: "",
  template_id: "",
  compute_spec: DEFAULT_CPU_INSTANCE_COMPUTE_SPEC,
  session_timeout: "120m",
  idle_timeout: "30m",
  on_timeout: "pause",
  egress_policy: "allowlist",
  egress_allowlist: "pypi.org\ngithub.com\nregistry.npmjs.org",
  auto_start: true,
};

export const SESSION_TIMEOUT_OPTIONS = ["30m", "45m", "60m", "90m", "120m", "240m"];
export const IDLE_TIMEOUT_OPTIONS = ["5m", "10m", "15m", "30m", "60m"];

export function parseEgressAllowlist(value: string) {
  return value
    .split(/\r?\n/)
    .map((host) => host.trim())
    .filter(Boolean);
}

export function getTemplateComputeSpec(template?: SandboxTemplate): CpuInstanceComputeSpec {
  if (!template?.cpu_cores || !template.memory_gb) {
    return INITIAL_VALUES.compute_spec;
  }

  return (
    CPU_INSTANCE_COMPUTE_SPECS.find(
      (option) =>
        option.cpu === String(template.cpu_cores) && option.memory === `${template.memory_gb}Gi`,
    )?.value ?? INITIAL_VALUES.compute_spec
  );
}

export function buildCreateRequest(
  values: FormValues,
  template: SandboxTemplate,
): CreateInstanceInput {
  const computeSpec =
    CPU_INSTANCE_COMPUTE_SPECS.find((option) => option.value === values.compute_spec) ??
    CPU_INSTANCE_COMPUTE_SPECS[1];

  return {
    name: values.name.trim(),
    kind: "sandbox",
    instance_type: "sandbox",
    image: template.image,
    cpu: computeSpec.cpu,
    memory: computeSpec.memory,
    auto_start: values.auto_start,
    termination_protection: false,
    replicas: 1,
    ssh_username: null,
    sandbox_config: {
      runtime_class: "sandbox-kata",
      template_id: template.id,
      session_timeout: values.session_timeout,
      idle_timeout: values.idle_timeout,
      on_timeout: values.on_timeout,
      network_egress_policy: values.egress_policy,
      egress_allowlist:
        values.egress_policy === "allowlist" ? parseEgressAllowlist(values.egress_allowlist) : [],
    },
  };
}
