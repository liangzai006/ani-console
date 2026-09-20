import {
  updateBucketStorageClass,
  type StorageBucketClass,
  type StorageBucketRecord,
} from "@/api/storage/buckets";
import { Modal, Select, Space, Typography } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type BucketStorageClassModalProps = {
  bucket: StorageBucketRecord;
  visible: boolean;
  onCancel: () => void;
};

export function BucketStorageClassModal({
  bucket,
  visible,
  onCancel,
}: BucketStorageClassModalProps) {
  const queryClient = useQueryClient();
  const [storageClass, setStorageClass] = useState<StorageBucketClass>(
    bucket.storage_class ?? "standard",
  );

  useEffect(() => {
    if (visible) setStorageClass(bucket.storage_class ?? "standard");
  }, [bucket.storage_class, visible]);

  const updateStorageClass = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "修改存储类型",
        successText: "存储类型已更新",
        errorFallback: "存储类型更新失败",
      },
    },
    mutationFn: () => updateBucketStorageClass(bucket.id, { storage_class: storageClass }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bucket", bucket.id] });
      void queryClient.invalidateQueries({ queryKey: ["buckets"] });
      onCancel();
    },
  });

  return (
    <Modal
      visible={visible}
      title="修改存储类型"
      onCancel={onCancel}
      onOk={() => updateStorageClass.mutateAsync()}
      confirmLoading={updateStorageClass.isPending}
      okButtonProps={{ disabled: storageClass === (bucket.storage_class ?? "standard") }}
      unmountOnExit
    >
      <Space direction="vertical" size={12} className="w-full">
        <Typography.Text>存储类型</Typography.Text>
        <Select
          value={storageClass}
          onChange={(value) => setStorageClass(value as StorageBucketClass)}
          className="w-full"
        >
          <Select.Option value="standard">标准</Select.Option>
          <Select.Option value="infrequent_access">低频</Select.Option>
        </Select>
      </Space>
    </Modal>
  );
}
