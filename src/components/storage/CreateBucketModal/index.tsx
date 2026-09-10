import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Modal, Select, Typography } from "@arco-design/web-react";
import { useState } from "react";
import {
  createBucket,
  updateBucketAcl,
  updateBucketStorageClass,
  type StorageBucketAcl,
  type StorageBucketClass,
  type StorageBucketRecord,
} from "@/api/storage/buckets";
import { showApiError } from "@/lib/api-error";
import { bucketNamePattern } from "@/lib/validators";

type Bucket = StorageBucketRecord;
type Acl = StorageBucketAcl;
type StorageClass = StorageBucketClass;

export function CreateBucketModal({
  visible,
  onCancel,
  onCreated,
}: {
  visible: boolean;
  onCancel: () => void;
  onCreated?: (bucket: Bucket) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [acl, setAcl] = useState<Acl>("private");
  const [storageClass, setStorageClass] = useState<StorageClass>("standard");
  const reset = () => {
    setName("");
    setAcl("private");
    setStorageClass("standard");
  };
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      const trimmedName = name.trim();
      if (!bucketNamePattern.test(trimmedName)) {
        throw new Error("存储桶名称需为 3-63 位小写字母、数字或连字符，且首尾必须是字母或数字");
      }
      const createData = { name: trimmedName, access_mode: "private" as const };
      const data = await createBucket(createData);
      const bucketId = data.id;
      if (acl !== "private") {
        await updateBucketAcl(bucketId, { acl });
      }
      if (storageClass !== "standard") {
        await updateBucketStorageClass(bucketId, { storage_class: storageClass });
      }
      return { ...data, acl, storage_class: storageClass } as Bucket;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["buckets"] });
      reset();
      onCreated?.(data);
      onCancel();
    },
    onError: (error) => showApiError(error),
  });
  return (
    <Modal
      visible={visible}
      title="创建存储桶"
      onCancel={() => {
        reset();
        onCancel();
      }}
      onOk={() => create.mutateAsync(undefined)}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="名称" required>
          <Input
            value={name}
            onChange={setName}
            placeholder="3-63 位小写字母、数字或连字符"
            maxLength={63}
          />
        </Form.Item>
        <Form.Item label="权限" required>
          <Select value={acl} onChange={setAcl}>
            <Select.Option value="private">私有</Select.Option>
            <Select.Option value="tenant_read">租户内读</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="存储类型" required>
          <Select value={storageClass} onChange={setStorageClass}>
            <Select.Option value="standard">标准</Select.Option>
            <Select.Option value="infrequent_access">低频</Select.Option>
          </Select>
        </Form.Item>
        <Typography.Text type="secondary">
          创建后可在存储桶详情页上传对象或登记对象元数据。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
