import { Descriptions, Empty, Space, Typography } from "@arco-design/web-react";
import type { components } from "@/api/core-schema";
import { DataTable } from "@/components/common";

type Instance = components["schemas"]["InstanceRecord"];
type Endpoint = NonNullable<
  NonNullable<Instance["network"]>["endpoints"]
>[number];

function joinedValues(values: Array<string | null | undefined>) {
  const available = values.filter((value): value is string => Boolean(value));
  return available.length ? available.join(" / ") : "—";
}

export function GpuInstanceNetwork({ instance }: { instance: Instance }) {
  const endpoints = instance.network?.endpoints ?? [];
  const securityGroups = instance.network?.security_groups ?? [];

  return (
    <Space direction="vertical" size={16} className="w-full">
      <Descriptions
        column={2}
        data={[
          {
            label: "VPC",
            value: joinedValues([
              instance.network?.vpc_name,
              instance.network?.vpc_id ?? instance.vpc_id,
            ]),
          },
          {
            label: "子网",
            value: joinedValues([
              instance.network?.subnet_name,
              instance.network?.subnet_id ?? instance.subnet_id,
            ]),
          },
          {
            label: "私网 IP",
            value: instance.network?.private_ip ?? instance.private_ip ?? "—",
          },
          { label: "访问地址", value: instance.endpoint ?? "—" },
          {
            label: "安全组",
            value: securityGroups.length
              ? securityGroups.map((group) => group.name ?? group.id).join("、")
              : "—",
          },
          {
            label: "负载均衡引用",
            value: instance.network?.load_balancer_refs?.length
              ? instance.network.load_balancer_refs.join("、")
              : "—",
          },
        ]}
      />
      <Typography.Title heading={6}>访问端点</Typography.Title>
      <DataTable<Endpoint>
        data={endpoints}
        rowKey={(endpoint) =>
          `${endpoint.name ?? "endpoint"}:${endpoint.address}:${endpoint.port ?? ""}`
        }
        pagination={false}
        noDataElement={<Empty description="暂无访问端点" />}
        columns={[
          { title: "名称", render: (_, endpoint) => endpoint.name ?? "—" },
          { title: "地址", dataIndex: "address" },
          {
            title: "协议",
            width: 120,
            render: (_, endpoint) => endpoint.protocol ?? "—",
          },
          {
            title: "端口",
            width: 100,
            render: (_, endpoint) => endpoint.port ?? "—",
          },
        ]}
      />
    </Space>
  );
}
