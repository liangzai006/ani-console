import type { StorageBucketRecord } from "@/api/storage/buckets";
import { uploadStorageObjectFile } from "@/api/storage/objects";
import { Button, Modal, Space, Typography, Upload } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type BucketUploadModalProps = {
  bucket?: StorageBucketRecord;
  onCancel: () => void;
};

export function BucketUploadModal({ bucket, onCancel }: BucketUploadModalProps) {
  const queryClient = useQueryClient();
  const upload = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "object-upload",
        action: "上传",
        errorFallback: "上传失败",
      },
    },
    mutationFn: (file: File) => {
      if (!bucket) throw new Error("存储桶不存在");
      return uploadStorageObjectFile({ bucketId: bucket.id, file, prefix: "/" });
    },
    onSuccess: () => {
      if (bucket) {
        void queryClient.invalidateQueries({ queryKey: ["bucket", bucket.id] });
        void queryClient.invalidateQueries({ queryKey: ["bucket-objects", bucket.id] });
      }
      void queryClient.invalidateQueries({ queryKey: ["buckets"] });
      onCancel();
    },
  });

  return (
    <Modal
      visible={Boolean(bucket)}
      title={bucket ? `上传对象 · ${bucket.name}` : "上传对象"}
      footer={null}
      onCancel={onCancel}
      unmountOnExit
    >
      <Space direction="vertical" size={16} className="w-full">
        <Typography.Text type="secondary">
          文件将上传到存储桶根目录，选择文件后立即开始上传。
        </Typography.Text>
        <Upload
          showUploadList={false}
          disabled={upload.isPending}
          customRequest={(options) => {
            upload.mutate(options.file as File);
            return { abort: () => undefined };
          }}
        >
          <Button type="primary" loading={upload.isPending}>
            选择文件并上传
          </Button>
        </Upload>
      </Space>
    </Modal>
  );
}
