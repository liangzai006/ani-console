import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Modal, Typography } from "@arco-design/web-react";
import { useState } from "react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import { newIdempotencyKey } from "@/lib/idempotency";

export function CreateVolumeSnapshotModal({
  visible,
  volumeId,
  onCancel,
}: {
  visible: boolean;
  volumeId: string;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const reset = () => setName("");
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("请输入快照名称");
      const { error } = await coreApi.POST("/volumes/{volume_id}/snapshots", {
        params: { path: { volume_id: volumeId } },
        body: { name: trimmedName, idempotency_key: newIdempotencyKey() },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volume-snapshots", volumeId] });
      qc.invalidateQueries({ queryKey: ["volume", volumeId] });
      qc.invalidateQueries({ queryKey: ["volumes"] });
      reset();
      onCancel();
    },
    onError: (error) => showApiError(error),
  });
  return (
    <Modal
      visible={visible}
      title="创建快照"
      onCancel={() => {
        reset();
        onCancel();
      }}
      onOk={() => create.mutateAsync(undefined)}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="快照名称" required>
          <Input
            value={name}
            onChange={setName}
            placeholder="请输入快照名称"
            maxLength={64}
            showWordLimit
          />
        </Form.Item>
        <Typography.Text type="secondary">
          快照用于在任意时间点恢复块存储卷数据。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
