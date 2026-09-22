import type { InstanceEnvVar, InstanceRecord } from "@/api/instances";
import { applyInstanceLifecycle } from "@/api/instances";
import { DataTable } from "@/components/common";
import { Empty, Modal, Space, Tooltip, Typography } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";

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
  const environmentVariables = instance.container?.env ?? [];
  const secretRefs = secretReferences(instance);
  const secretRows: SecretRow[] = secretRefs.map((reference) => ({
    reference,
    id: secretId(reference),
    purpose: secretPurpose(reference),
  }));
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
        <DataTable<InstanceEnvVar>
          data={environmentVariables}
          rowKey="name"
          pagination={false}
          noDataElement={<Empty description="暂无环境变量" />}
          columns={[
            { title: "名称", dataIndex: "name", ellipsis: true },
            // {
            //   title: "类型",
            //   width: 120,
            //   render: (_, environmentVariable) =>
            //     environmentVariable.secret_ref ? (
            //       <Tag color="purple">密钥引用</Tag>
            //     ) : (
            //       <Tag color="gray">普通值</Tag>
            //     ),
            // },
            {
              title: "值",
              render: (_, environmentVariable) =>
                environmentVariable.secret_ref ? (
                  <Tooltip content="该变量引用密钥，不显示明文">
                    <span className="font-mono">******</span>
                  </Tooltip>
                ) : environmentVariable.value === "" ? (
                  <span className="font-mono">&quot;&quot;</span>
                ) : (
                  <Tooltip content={environmentVariable.value ?? "-"}>
                    <span className="block min-w-0 truncate font-mono">
                      {environmentVariable.value ?? "-"}
                    </span>
                  </Tooltip>
                ),
            },
            // {
            //   title: "密钥引用",
            //   dataIndex: "secret_ref",
            //   placeholder: "-",
            //   ellipsis: true,
            // },
          ]}
        />
      </section>

      <section>
        <DataTable<SecretRow>
          header={{ title: "绑定密钥", extra: secretAction }}
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
            { title: "密钥", dataIndex: "id", ellipsis: true },
            { title: "用途", dataIndex: "purpose" },
          ]}
        />
      </section>
    </Space>
  );
}
