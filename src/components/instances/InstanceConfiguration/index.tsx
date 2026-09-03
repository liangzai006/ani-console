import {
  Button,
  Descriptions,
  Empty,
  Message,
  Modal,
  Space,
  Typography,
} from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { DataTable } from "@/components/common";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { newIdempotencyKey } from "@/lib/idempotency";

type Instance = components["schemas"]["InstanceRecord"];

type SecretRow = {
  reference: string;
  id: string;
  purpose: string;
};

function secretReferences(instance: Instance) {
  const refs = [
    instance.ssh?.key_ref,
    ...(instance.resource_refs ?? []),
  ].filter((ref): ref is string => Boolean(ref));
  return Array.from(
    new Set(refs.filter((ref) => /secret|key|credential/i.test(ref))),
  );
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
}: {
  instance: Instance;
  onChanged: () => void;
}) {
  const secretRefs = secretReferences(instance);
  const secretRows: SecretRow[] = secretRefs.map((reference) => ({
    reference,
    id: secretId(reference),
    purpose: secretPurpose(reference),
  }));
  const scopes = instance.workload_identity?.scopes ?? [];
  const unbindSecret = useMutation({
    mutationFn: async (reference: string) => {
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body: {
            action: "unbind_secret",
            idempotency_key: newIdempotencyKey(),
            secret_id: secretId(reference),
          },
        },
      );
      if (error) {
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error) }),
          status: response.status,
        };
      }
    },
    onSuccess: () => {
      Message.success("密钥解绑已提交");
      onChanged();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  return (
    <Space direction="vertical" size={24} className="w-full">
      <section>
        <Typography.Title heading={6}>环境变量</Typography.Title>
        <Empty description="暂无环境变量" />
      </section>

      <section>
        <Typography.Title heading={6}>绑定密钥</Typography.Title>
        <DataTable<SecretRow>
          data={secretRows}
          rowKey="reference"
          pagination={false}
          noDataElement={<Empty description="暂无绑定密钥" />}
          columns={[
            { title: "密钥", dataIndex: "id" },
            { title: "用途", dataIndex: "purpose" },
            {
              title: "操作",
              width: 100,
              render: (_, secret) => (
                <Button
                  type="text"
                  status="danger"
                  loading={
                    unbindSecret.isPending &&
                    unbindSecret.variables === secret.reference
                  }
                  onClick={() =>
                    Modal.confirm({
                      title: "解绑密钥",
                      content: `确定解绑「${secret.id}」？`,
                      onOk: () => unbindSecret.mutateAsync(secret.reference),
                    })
                  }
                >
                  解绑
                </Button>
              ),
            },
          ]}
        />
      </section>

      <section>
        <Typography.Title heading={6}>Workload Identity</Typography.Title>
        <Descriptions
          column={1}
          labelStyle={{ width: '120px' }}
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
