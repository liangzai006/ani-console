import { Empty, Space, Typography } from "@arco-design/web-react";
import type { components } from "@/api/core-schema";
import { DataTable } from "@/components/common";

type Instance = components["schemas"]["InstanceRecord"];
type ImageRow = {
  key: string;
  name: string;
};
type SecurityRow = {
  key: string;
  type: string;
  name: string;
};

function resourceLabel(name?: string | null, id?: string | null) {
  if (name && id && name !== id) return `${name} · ${id}`;
  return name ?? id ?? "-";
}

export function GpuInstanceNetwork({ instance }: { instance: Instance }) {
  const network = instance.network;
  const vpcId = network?.vpc_id ?? instance.vpc_id;
  const subnetId = network?.subnet_id ?? instance.subnet_id;
  const imageName =
    instance.image?.ref ??
    instance.image?.name ??
    instance.image?.id ??
    "";
  const images: ImageRow[] = imageName
    ? [{ key: instance.image?.id ?? imageName, name: imageName }]
    : [];
  const sshKeyRef = instance.ssh?.key_ref;
  const secretRefs = Array.from(
    new Set(
      (instance.resource_refs ?? []).filter(
        (reference) =>
          /secret|key|credential/i.test(reference) && reference !== sshKeyRef,
      ),
    ),
  );
  const securityAssociations: SecurityRow[] = [
    ...(network?.security_groups ?? []).map((group) => ({
      key: `security-group:${group.id}`,
      type: "安全组",
      name: group.name ?? group.id,
    })),
    ...(sshKeyRef
      ? [{ key: `ssh-key:${sshKeyRef}`, type: "SSH 密钥", name: sshKeyRef }]
      : []),
    ...secretRefs.map((reference) => ({
      key: `secret:${reference}`,
      type: "绑定密钥",
      name: reference,
    })),
  ];

  return (
    <Space direction="vertical" size={24} className="w-full">
      <section>
        <Typography.Title heading={6}>网络配置</Typography.Title>
        <DataTable
          data={[
            {
              type: "VPC",
              name: resourceLabel(network?.vpc_name, vpcId),
            },
            {
              type: "子网",
              name: resourceLabel(network?.subnet_name, subnetId),
            },
          ]}
          rowKey="type"
          pagination={false}
          columns={[
            { title: "类型", dataIndex: "type", width: 140 },
            { title: "资源", dataIndex: "name" },
          ]}
        />
      </section>

      <section>
        <Typography.Title heading={6}>镜像关联</Typography.Title>
        <DataTable<ImageRow>
          data={images}
          rowKey="key"
          pagination={false}
          noDataElement={<Empty description="暂无关联镜像" />}
          columns={[{ title: "镜像", dataIndex: "name" }]}
        />
      </section>

      <section>
        <Typography.Title heading={6}>安全关联</Typography.Title>
        <DataTable<SecurityRow>
          data={securityAssociations}
          rowKey="key"
          pagination={false}
          noDataElement={<Empty description="暂无安全关联" />}
          columns={[
            { title: "关联类型", dataIndex: "type", width: 160 },
            { title: "关联对象", dataIndex: "name" },
          ]}
        />
      </section>
    </Space>
  );
}
