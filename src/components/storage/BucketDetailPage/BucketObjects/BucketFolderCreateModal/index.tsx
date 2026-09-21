import { createBucketPrefix } from "@/api/storage/buckets";
import { Input, Modal, Typography } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function BucketFolderCreateModal({
  bucketId,
  prefix,
  onCancel,
  onCreated,
}: {
  bucketId: string;
  prefix: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [folderName, setFolderName] = useState("");
  const createFolder = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "folder-create",
        action: "创建",
        errorFallback: "请求失败",
      },
    },
    mutationFn: async () => {
      const name = folderName.trim().replace(/^\/+|\/+$/g, "");
      if (!name) throw new Error("请输入文件夹名称");
      return createBucketPrefix(bucketId, {
        prefix: prefix === "/" ? `${name}/` : `${prefix}${name}/`,
      });
    },
    onSuccess: () => {
      onCreated();
      onCancel();
    },
  });

  return (
    <Modal
      visible
      title="新建文件夹"
      onCancel={onCancel}
      onOk={() => createFolder.mutateAsync()}
      confirmLoading={createFolder.isPending}
      unmountOnExit
    >
      <Input
        value={folderName}
        onChange={setFolderName}
        placeholder="请输入文件夹名称"
        onPressEnter={() => createFolder.mutateAsync()}
      />
      <Typography.Text type="secondary" className="mt-3 block">
        将在当前路径「{prefix === "/" ? "桶根目录" : prefix}」下创建前缀。
      </Typography.Text>
    </Modal>
  );
}
