import {
  updateBucketAcl,
  type StorageBucketAcl,
  type StorageBucketRecord,
} from "@/api/storage/buckets";
import { Button, Radio, Space, Typography } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type BucketAclEditorProps = {
  bucket: StorageBucketRecord;
  onSaved?: () => void;
};

export function BucketAclEditor({ bucket, onSaved }: BucketAclEditorProps) {
  const queryClient = useQueryClient();
  const [acl, setAcl] = useState<StorageBucketAcl>(bucket.acl ?? "private");

  useEffect(() => {
    setAcl(bucket.acl ?? "private");
  }, [bucket.acl, bucket.id]);

  const updateAcl = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "保存对象存储权限",
        successText: "对象存储权限已保存",
        errorFallback: "对象存储权限保存失败",
      },
    },
    mutationFn: (nextAcl: StorageBucketAcl) => updateBucketAcl(bucket.id, { acl: nextAcl }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bucket", bucket.id] });
      void queryClient.invalidateQueries({ queryKey: ["buckets"] });
      onSaved?.();
    },
  });

  return (
    <Space direction="vertical" size={20} className="w-full">
      <Typography.Title heading={6} className="mt-0! mb-0!">
        访问权限
      </Typography.Title>
      <Radio.Group
        direction="vertical"
        value={acl}
        onChange={(value) => setAcl(value as StorageBucketAcl)}
      >
        <Radio value="private">
          <span className="ml-2 inline-flex flex-col gap-1 align-top">
            <Typography.Text>私有</Typography.Text>
            <Typography.Text type="secondary">仅被授权的人可读写。</Typography.Text>
          </span>
        </Radio>
        <Radio value="tenant_read">
          <span className="ml-2 inline-flex flex-col gap-1 align-top">
            <Typography.Text>租户内读</Typography.Text>
            <Typography.Text type="secondary">
              本租户成员可读，外人不可读。写仍须授权。
            </Typography.Text>
          </span>
        </Radio>
      </Radio.Group>
      <div>
        <Button
          type="primary"
          loading={updateAcl.isPending}
          disabled={acl === (bucket.acl ?? "private")}
          onClick={() => updateAcl.mutateAsync(acl)}
        >
          保存权限
        </Button>
      </div>
    </Space>
  );
}
