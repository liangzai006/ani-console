import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Form, InputNumber, Modal, Typography } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { expandFilesystem, type StorageFilesystem } from "@/api/storage/filesystems";
import { showApiError } from "@/lib/api-error";

type Filesystem = StorageFilesystem;

export function ExpandFilesystemModal({
  visible,
  filesystem,
  onCancel,
  onExpanded,
}: {
  visible: boolean;
  filesystem: Filesystem | null;
  onCancel: () => void;
  onExpanded?: () => void;
}) {
  const qc = useQueryClient();
  const [sizeGiB, setSizeGiB] = useState(1);
  useEffect(() => {
    if (visible && filesystem) setSizeGiB(filesystem.size_gib + 1);
  }, [filesystem, visible]);
  const expand = useMutation({
    mutationFn: async (_: undefined) => {
      if (!filesystem) throw new Error("文件存储不存在");
      if (!Number.isInteger(sizeGiB) || sizeGiB <= filesystem.size_gib) {
        throw new Error(`新容量必须大于当前容量 ${filesystem.size_gib} GiB`);
      }
      return expandFilesystem(filesystem.id, { size_gib: sizeGiB });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filesystems"] });
      if (filesystem) qc.invalidateQueries({ queryKey: ["filesystem", filesystem.id] });
      onExpanded?.();
      onCancel();
    },
    onError: (error) => showApiError(error),
  });
  return (
    <Modal
      visible={visible}
      title="扩容文件存储"
      onCancel={onCancel}
      onOk={() => expand.mutateAsync(undefined)}
      confirmLoading={expand.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Alert
          type="info"
          showIcon
          content={`当前容量 ${filesystem?.size_gib ?? "-"} GiB；文件存储只支持扩容，不支持缩容。`}
        />
        <Form.Item label="新容量 (GiB)" required>
          <InputNumber
            value={sizeGiB}
            min={(filesystem?.size_gib ?? 0) + 1}
            precision={0}
            className="w-full"
            onChange={(value) => setSizeGiB(Number(value ?? 1))}
          />
        </Form.Item>
        <Typography.Text type="secondary">提交后容量不可调小，请确认目标容量。</Typography.Text>
      </Form>
    </Modal>
  );
}
