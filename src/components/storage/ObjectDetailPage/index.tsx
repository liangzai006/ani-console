import { withId } from "@/lib/id";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal, Space, Tooltip } from "@arco-design/web-react";
import {
  completeStorageObjectUpload,
  deleteStorageObject,
  getStorageObject,
  getStorageObjectDownload,
  type StorageObject,
} from "@/api/storage/objects";

import {
  AliIcon,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
  StatusTag,
} from "@/components/common";
import { openExternalUrl } from "@/lib/browser";
import { formatBytes, formatDateTime } from "@/lib/format";

export function ObjectDetailPage({ bucketId, objectId }: { bucketId: string; objectId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("object", objectId),
        action: "对象加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["object", objectId],
    queryFn: () => getStorageObject(objectId),
  });
  const completeUpload = useMutation({
    meta: { feedback: { channel: "message", action: "上传", errorFallback: "请求失败" } },
    mutationFn: (_: undefined) => completeStorageObjectUpload(objectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["object", objectId] });
      qc.invalidateQueries({ queryKey: ["bucket-objects", bucketId] });
      qc.invalidateQueries({ queryKey: ["buckets"] });
    },
  });
  const downloadObject = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "object-download",
        action: "操作",
        errorFallback: "请求失败",
      },
    },
    mutationFn: async (_: undefined) => {
      const data = await getStorageObjectDownload(objectId);
      if (data?.download_url) openExternalUrl(data.download_url);
    },
  });
  const deleteObject = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "object-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (_: undefined) => deleteStorageObject(objectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buckets"] });
      qc.invalidateQueries({ queryKey: ["bucket-objects", bucketId] });
      navigate({ to: "/objects/$bucketId", params: { bucketId } });
    },
  });

  if (!detail.data) return <DetailPagePlaceholder loading={detail.isLoading} />;

  const object = detail.data as StorageObject;
  const objectStatus = object.reason ? (
    <Tooltip content={object.reason}>
      <span className="inline-flex">
        <StatusTag status={object.state} />
      </span>
    </Tooltip>
  ) : (
    <StatusTag status={object.state} />
  );

  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "存储" },
        { label: "对象存储", to: "/objects" },
        {
          label: object.bucket,
          to: "/objects/$bucketId",
          params: { bucketId },
        },
        { label: object.key },
      ]}
      title={object.key}
      status={objectStatus}
      icon={<AliIcon name="file" size={28} />}
      headerItems={[
        { label: "大小", value: formatBytes(object.size_bytes) },
        { label: "创建时间", value: formatDateTime(object.created_at) },
      ]}
      actions={
        <Space wrap>
          {object.state === "pending" ? (
            <Button
              type="primary"
              loading={completeUpload.isPending}
              onClick={() => completeUpload.mutateAsync(undefined)}
            >
              确认上传完成
            </Button>
          ) : null}
          <Button
            loading={downloadObject.isPending}
            disabled={object.state === "pending"}
            onClick={() => downloadObject.mutateAsync(undefined)}
          >
            下载
          </Button>
          <Button
            status="danger"
            onClick={() =>
              Modal.confirm({
                title: "删除对象",
                content: `确定删除对象「${object.key}」？`,
                okButtonProps: { status: "danger" },
                onOk: () => deleteObject.mutateAsync(undefined),
              })
            }
          >
            删除
          </Button>
        </Space>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: <ResourceId value={object.id} /> },
            { label: "Bucket", value: object.bucket },
            { label: "Key", value: object.key },
            { label: "大小", value: formatBytes(object.size_bytes) },
            { label: "类型", value: object.content_type },
            { label: "状态", value: objectStatus },
            { label: "创建时间", value: formatDateTime(object.created_at) },
            { label: "更新时间", value: formatDateTime(object.updated_at) },
          ],
        },
      ]}
      onBack={() => navigate({ to: "/objects/$bucketId", params: { bucketId } })}
    />
  );
}
