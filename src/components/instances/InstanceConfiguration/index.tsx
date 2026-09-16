import type { InstanceRecord } from "@/api/instances";
import { applyInstanceLifecycle } from "@/api/instances";
import { Descriptions, Empty, Modal, Space, Typography } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { DataTable, TableSectionHeader } from "@/components/common";

type Instance = InstanceRecord;

type SecretRow = {
  reference: string;
  id: string;
  purpose: string;
};

function secretReferences(instance: Instance) {
  const refs = [instance.ssh?.key_ref, ...(instance.resource_refs ?? [])].filter(
    (ref): ref is string => Boolean(ref),
  );
  return Array.from(new Set(refs.filter((ref) => /secret|key|credential/i.test(ref))));
}

function secretId(reference: string) {
  return reference.replace(/^(secret|key|credential)[/:]/i, "");
}

function secretPurpose(reference: string) {
  return /pull|image|img/i.test(reference) ? "镜像拉取" : "实例密钥";
}

export function InstanceConfiguration({
  instance,
  onChanged,
  secretAction,
}: {
  instance: Instance;
  onChanged: () => void;
  secretAction?: ReactNode;
}) {
  const secretRefs = secretReferences(instance);
  const secretRows: SecretRow[] = secretRefs.map((reference) => ({
    reference,
    id: secretId(reference),
    purpose: secretPurpose(reference),
  }));
  const scopes = instance.workload_identity?.scopes ?? [];
  const unbindSecret = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "secret-unbind",
        action: "操作",
        successText: "密钥解绑已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (reference: string) => {
      const submitData = {
        action: "unbind_secret" as const,
        secret_id: secretId(reference),
      };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onChanged();
    },
  });

  return (
    <Space direction="vertical" size={24} className="w-full">
      <section>
        <Typography.Title heading={6}>环境变量</Typography.Title>
        <Empty description="暂无环境变量" />
      </section>

      <section>
        <TableSectionHeader title="绑定密钥" extra={secretAction} />
        <DataTable<SecretRow>
          data={secretRows}
          rowKey="reference"
          pagination={false}
          noDataElement={<Empty description="暂无绑定密钥" />}
          rowActions={[
            {
              key: "unbind",
              label: "解绑",
              intent: "danger",
              loading: (secret) =>
                unbindSecret.isPending && unbindSecret.variables === secret.reference,
              onClick: (secret) => {
                Modal.confirm({
                  title: "解绑密钥",
                  content: `确定解绑「${secret.id}」？`,
                  okButtonProps: { status: "danger" },
                  onOk: () => unbindSecret.mutateAsync(secret.reference),
                });
              },
            },
          ]}
          columns={[
            { title: "密钥", dataIndex: "id" },
            { title: "用途", dataIndex: "purpose" },
          ]}
        />
      </section>

      <section>
        <Typography.Title heading={6}>Workload Identity</Typography.Title>
        <Descriptions
          column={1}
          labelStyle={{ width: "120px" }}
          data={[
            {
              label: "状态",
              value: instance.workload_identity?.active ? "已绑定" : "未绑定",
            },
            {
              label: "Key 前缀",
              value: instance.workload_identity?.key_prefix ?? "-",
            },
            {
              label: "Scopes",
              value: scopes.length ? scopes.join("、") : "-",
            },
          ]}
        />
      </section>
    </Space>
  );
}
