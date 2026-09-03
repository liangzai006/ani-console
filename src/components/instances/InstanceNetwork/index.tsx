import { Empty, Space, Typography } from "@arco-design/web-react";
import type { components } from "@/api/core-schema";
import { DataTable, ImageNameText } from "@/components/common";

type Instance = components["schemas"]["InstanceRecord"];
type ImageRow = {
  key: string;
  image: NonNullable<Instance["image"]>;
};
type SecurityRow = {
  key: string;
  type: string;
  name: string;
};
type StorageRow = {
  key: string;
  type: string;
  name: string;
};

function resourceLabel(name?: string | null, id?: string | null) {
  if (name && id && name !== id) return `${name} · ${id}`;
  return name ?? id ?? "-";
}

function volumeKindLabel(
  kind: NonNullable<Instance["volumes"]>[number]["kind"],
) {
  const labels: Record<typeof kind, string> = {
    root_disk: "系统盘",
    data_disk: "数据盘",
    cdrom: "光驱",
    shared_pvc: "共享 PVC",
    object_fuse: "对象存储挂载",
    ephemeral: "临时盘",
  };
  return labels[kind];
}

function attachmentTypeLabel(type: string) {
  if (type === "volume") return "云盘";
  if (type === "filesystem") return "文件存储";
  return type;
}

export function InstanceNetwork({ instance }: { instance: Instance }) {
  const network = instance.network;
  const vpcId = network?.vpc_id ?? instance.vpc_id;
  const subnetId = network?.subnet_id ?? instance.subnet_id;
  const images: ImageRow[] = instance.image
    ? [
        {
          key: instance.image.id ?? instance.image.ref ?? "image",
          image: instance.image,
        },
      ]
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
  const storageAssociations = new Map<string, StorageRow>();
  (instance.volumes ?? []).forEach((volume) => {
    const resourceId = volume.source_ref?.replace(/^[^/]+\//, "");
    const key = volume.source_ref
      ? volume.source_ref.replace("/", ":")
      : `${volume.kind}:${volume.name}`;
    storageAssociations.set(key, {
      key,
      type: volumeKindLabel(volume.kind),
      name: resourceLabel(volume.name, resourceId),
    });
  });
  (instance.storage_attachments ?? []).forEach((attachment) => {
    const key = `${attachment.resource_type}:${attachment.resource_id}`;
    if (storageAssociations.has(key)) return;
    storageAssociations.set(key, {
      key,
      type: attachmentTypeLabel(attachment.resource_type),
      name: resourceLabel(attachment.resource_name, attachment.resource_id),
    });
  });

  return (
    <Space direction="vertical" size={24} className="w-full">
      <section>
        <Typography.Title heading={6}>网络关联</Typography.Title>
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
          columns={[
            {
              title: "镜像",
              render: (_, row) => <ImageNameText image={row.image} />,
            },
          ]}
        />
      </section>

      <section>
        <Typography.Title heading={6}>存储关联</Typography.Title>
        <DataTable<StorageRow>
          data={Array.from(storageAssociations.values())}
          rowKey="key"
          pagination={false}
          noDataElement={<Empty description="暂无存储关联" />}
          columns={[
            { title: "存储类型", dataIndex: "type", width: 160 },
            { title: "关联对象", dataIndex: "name" },
          ]}
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
