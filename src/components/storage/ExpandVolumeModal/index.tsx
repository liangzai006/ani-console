import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Form, InputNumber, Modal, Typography } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { expandVolume, type StorageVolume } from "@/api/storage/volumes";
import { showApiError } from "@/lib/api-error";

type Volume = StorageVolume;

export function ExpandVolumeModal({
  visible,
  volume,
  onCancel,
}: {
  visible: boolean;
  volume: Volume | null;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [sizeGiB, setSizeGiB] = useState(1);
  useEffect(() => {
    if (visible && volume) setSizeGiB(volume.size_gib + 1);
  }, [visible, volume]);
  const expand = useMutation({
    mutationFn: async (_: undefined) => {
      if (!volume) throw new Error("块存储卷不存在");
      if (!Number.isInteger(sizeGiB) || sizeGiB <= volume.size_gib)
        throw new Error(`新容量必须大于当前容量 ${volume.size_gib} GiB`);
      return expandVolume(volume.id, { size_gib: sizeGiB });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volumes"] });
      if (volume) qc.invalidateQueries({ queryKey: ["volume", volume.id] });
      onCancel();
    },
    onError: (error) => showApiError(error),
  });
  return (
    <Modal
      visible={visible}
      title="扩容块存储卷"
      onCancel={onCancel}
      onOk={() => expand.mutateAsync(undefined)}
      confirmLoading={expand.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Alert
          type="info"
          showIcon
          content={`当前容量 ${volume?.size_gib ?? "-"} GiB；块存储只支持扩容，不支持缩容。`}
        />
        <Form.Item label="新容量 (GiB)" required>
          <InputNumber
            value={sizeGiB}
            min={(volume?.size_gib ?? 0) + 1}
            precision={0}
            className="w-full"
            onChange={(value) => setSizeGiB(Number(value ?? 1))}
          />
        </Form.Item>
        <Typography.Text type="secondary">
          扩容后请按操作系统要求扩展分区和文件系统。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
