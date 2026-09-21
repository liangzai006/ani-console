import {
  deleteBucketObject,
  generateBucketObjectPresignedUrl,
  listBucketObjects,
  type StorageBucketObjectEntry,
  type StorageBucketRecord,
} from "@/api/storage/buckets";
import { uploadStorageObjectFile } from "@/api/storage/objects";
import { ObjectBrowser } from "@/components/storage/ObjectBrowser";
import { openExternalUrl } from "@/lib/browser";
import { copyToClipboard } from "@/lib/clipboard";
import { withId } from "@/lib/id";
import { Button, Modal, Upload } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BucketFolderCreateModal } from "./BucketFolderCreateModal";

export function BucketObjects({
  bucketId,
  bucket,
}: {
  bucketId: string;
  bucket: StorageBucketRecord;
}) {
  const qc = useQueryClient();
  const [prefix, setPrefix] = useState("/");
  const [folderVisible, setFolderVisible] = useState(false);
  const objects = useQuery({
    meta: {
      errorNotification: {
        id: withId("bucket-objects", bucketId, prefix),
        action: "对象列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["bucket-objects", bucketId, prefix],
    queryFn: () => listBucketObjects(bucketId, { prefix, limit: 100 }),
  });
  const entries = (objects.data?.items ?? []) as StorageBucketObjectEntry[];
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["bucket", bucketId] });
    void qc.invalidateQueries({ queryKey: ["bucket-objects", bucketId] });
    void qc.invalidateQueries({ queryKey: ["buckets"] });
  };
  const upload = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "object-upload",
        action: "上传",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (file: File) => uploadStorageObjectFile({ bucketId, file, prefix }),
    onSuccess: refresh,
  });
  const deleteEntry = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "object-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (entry: StorageBucketObjectEntry) => deleteBucketObject(bucketId, entry.key),
    onSuccess: refresh,
  });
  const generateLink = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "object-link",
        action: "生成",
        successText: "临时链接已生成",
        errorFallback: "请求失败",
      },
    },
    mutationFn: async ({
      entry,
      action: linkAction,
    }: {
      entry: StorageBucketObjectEntry;
      action: "download" | "copy";
    }) => {
      const data = await generateBucketObjectPresignedUrl(bucketId, {
        key: entry.key,
        method: "GET",
        expires_hours: 24,
      });
      return { data, action: linkAction };
    },
    onSuccess: async ({ data, action: linkAction }) => {
      if (!data?.download_url) return;
      if (linkAction === "download") {
        openExternalUrl(data.download_url);
        return;
      }
      await copyToClipboard(data.download_url, "临时链接");
    },
  });

  const aclLabel = bucket.acl === "tenant_read" ? "租户内读" : "私有";
  return (
    <>
      <ObjectBrowser
        bucketName={bucket.name}
        prefix={prefix}
        entries={entries}
        aclLabel={aclLabel}
        loading={objects.isLoading}
        actionLoading={generateLink.isPending}
        primaryAction={
          <Upload
            showUploadList={false}
            customRequest={(option) => upload.mutate(option.file as File)}
          >
            <Button type="primary" loading={upload.isPending}>
              上传对象
            </Button>
          </Upload>
        }
        onNavigate={(target) => {
          setPrefix(target);
        }}
        onCreateFolder={() => setFolderVisible(true)}
        onCopyPath={(entry) => copyToClipboard(entry.key, "对象路径")}
        onDownload={(entry) => generateLink.mutateAsync({ entry, action: "download" })}
        onCopyLink={(entry) => generateLink.mutateAsync({ entry, action: "copy" })}
        onDelete={(entry) =>
          Modal.confirm({
            title: entry.kind === "prefix" ? "删除文件夹" : "删除对象",
            content: `确定删除「${entry.key}」？`,
            okButtonProps: { status: "danger" },
            onOk: () => deleteEntry.mutateAsync(entry),
          })
        }
      />
      {folderVisible && (
        <BucketFolderCreateModal
          bucketId={bucketId}
          prefix={prefix}
          onCancel={() => setFolderVisible(false)}
          onCreated={refresh}
        />
      )}
    </>
  );
}
