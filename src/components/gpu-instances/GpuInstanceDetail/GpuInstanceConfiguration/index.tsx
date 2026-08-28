import { Descriptions, Space, Tag } from "@arco-design/web-react";
import type { components } from "@/api/core-schema";

type Instance = components["schemas"]["InstanceRecord"];

function secretReferences(instance: Instance) {
  const refs = [
    instance.ssh?.key_ref,
    ...(instance.resource_refs ?? []),
  ].filter((ref): ref is string => Boolean(ref));
  return Array.from(
    new Set(refs.filter((ref) => /secret|key|credential/i.test(ref))),
  );
}

export function GpuInstanceConfiguration({ instance }: { instance: Instance }) {
  const secretRefs = secretReferences(instance);
  const scopes = instance.workload_identity?.scopes ?? [];

  return (
    <Descriptions
      column={1}
      data={[
        { label: "环境变量创建意图", value: "未配置" },
        {
          label: "密钥引用",
          value: secretRefs.length ? (
            <Space wrap size={4}>
              {secretRefs.map((reference) => (
                <Tag key={reference}>{reference}</Tag>
              ))}
            </Space>
          ) : (
            "—"
          ),
        },
        {
          label: "Workload Identity 前缀",
          value: instance.workload_identity?.key_prefix ?? "—",
        },
        {
          label: "Workload Identity scopes",
          value: scopes.length ? (
            <Space wrap size={4}>
              {scopes.map((scope) => (
                <Tag key={scope}>{scope}</Tag>
              ))}
            </Space>
          ) : (
            "—"
          ),
        },
      ]}
    />
  );
}
