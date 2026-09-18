import {
  AliIcon,
  DataTable,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
} from "@/components/common";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Descriptions,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
} from "@arco-design/web-react";
import { useEffect, useRef, useState } from "react";
import {
  createBucketPrefix,
  deleteBucketLifecycleRule,
  deleteBucketObject,
  generateBucketObjectPresignedUrl,
  getBucket,
  listBucketLifecycleRules,
  listBucketObjects,
  updateBucketAcl,
  updateBucketStorageClass,
  type StorageBucketLifecycleRule,
  type StorageBucketObjectEntry,
  type StorageBucketRecord,
} from "@/api/storage/buckets";
import { uploadStorageObjectFile } from "@/api/storage/objects";

import { CreateLifecycleRuleModal } from "@/components/storage/CreateLifecycleRuleModal";
import { ObjectBrowser } from "@/components/storage/ObjectBrowser";
import { copyToClipboard } from "@/lib/clipboard";
import { formatBytes, formatDateTime } from "@/lib/format";
import { withId } from "@/lib/id";

type Bucket = StorageBucketRecord;
type BucketEntry = StorageBucketObjectEntry;
type LifecycleRule = StorageBucketLifecycleRule;

export function BucketDetailPage({
  bucketId,
  tab,
  action,
}: {
  bucketId: string;
  tab?: "objects" | "permissions" | "lifecycle" | "access" | "overview";
  action?: "upload";
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const uploadTriggerRef = useRef<HTMLButtonElement>(null);
  const [prefix, setPrefix] = useState("/");
  const [folderVisible, setFolderVisible] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [ruleVisible, setRuleVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<LifecycleRule | undefined>(undefined);
  const [aclDraft, setAclDraft] = useState<Bucket["acl"]>("private");
  const [classDraft, setClassDraft] = useState<Bucket["storage_class"]>("standard");

  const bucket = useQuery({
    meta: {
      errorNotification: {
        id: withId("bucket", bucketId),
        action: "存储桶加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["bucket", bucketId],
    queryFn: () => getBucket(bucketId),
  });
  const bucketEntries = useQuery({
    meta: {
      errorNotification: {
        id: withId("bucket-objects", bucketId, prefix),
        action: "对象列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["bucket-objects", bucketId, prefix],
    queryFn: () => listBucketObjects(bucketId, { prefix, limit: 100 }),
    enabled: !!bucket.data,
  });
  const lifecycleRules = useQuery({
    meta: {
      errorNotification: {
        id: withId("bucket-lifecycle", bucketId),
        action: "生命周期规则加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["bucket-lifecycle-rules", bucketId],
    queryFn: () => listBucketLifecycleRules(bucketId),
    enabled: !!bucket.data,
  });
  useEffect(() => {
    if (bucket.data) {
      setAclDraft(bucket.data.acl ?? "private");
      setClassDraft(bucket.data.storage_class ?? "standard");
    }
  }, [bucket.data]);

  useEffect(() => {
    if (action !== "upload" || !bucket.data) return;
    const frame = window.requestAnimationFrame(() => {
      uploadTriggerRef.current?.click();
      void navigate({
        to: "/objects/$bucketId",
        params: { bucketId },
        search: { tab: "objects" },
        replace: true,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [action, bucket.data, bucketId, navigate]);

  const refreshBucket = () => {
    qc.invalidateQueries({ queryKey: ["bucket", bucketId] });
    qc.invalidateQueries({ queryKey: ["bucket-objects", bucketId] });
    qc.invalidateQueries({ queryKey: ["buckets"] });
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
    mutationFn: (file: File) =>
      uploadStorageObjectFile({
        bucketId,
        file,
        prefix,
      }),
    onSuccess: refreshBucket,
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
    mutationFn: (entry: BucketEntry) => deleteBucketObject(bucketId, entry.key),
    onSuccess: refreshBucket,
  });
  const createFolder = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "folder-create",
        action: "创建",
        errorFallback: "请求失败",
      },
    },
    mutationFn: async (_: undefined) => {
      const name = folderName.trim().replace(/^\/+|\/+$/g, "");
      if (!name) throw new Error("请输入文件夹名称");
      return createBucketPrefix(bucketId, {
        prefix: prefix === "/" ? `${name}/` : `${prefix}${name}/`,
      });
    },
    onSuccess: () => {
      setFolderVisible(false);
      setFolderName("");
      refreshBucket();
    },
  });
  const generateLink = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "object-link",
        action: "操作",
        successText: "临时链接已生成",
        errorFallback: "请求失败",
      },
    },
    mutationFn: async ({ entry, action }: { entry: BucketEntry; action: "download" | "copy" }) => {
      const data = await generateBucketObjectPresignedUrl(bucketId, {
        key: entry.key,
        method: "GET",
        expires_hours: 24,
      });
      return { data, action };
    },
    onSuccess: async ({ data, action }) => {
      if (!data?.download_url) return;
      if (action === "download") {
        window.open(data.download_url, "_blank", "noopener,noreferrer");
        return;
      }
      await copyToClipboard(data.download_url, "临时链接");
    },
  });
  const updateAcl = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "bucket-acl-update",
        action: "更新",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (_: undefined) => updateBucketAcl(bucketId, { acl: aclDraft ?? "private" }),
    onSuccess: () => {
      refreshBucket();
    },
  });
  const updateClass = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "bucket-class-update",
        action: "更新",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (_: undefined) =>
      updateBucketStorageClass(bucketId, { storage_class: classDraft ?? "standard" }),
    onSuccess: () => {
      refreshBucket();
    },
  });
  const deleteRule = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "lifecycle-rule-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (rule: LifecycleRule) => deleteBucketLifecycleRule(bucketId, rule.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bucket-lifecycle-rules", bucketId] });
      refreshBucket();
    },
  });

  if (!bucket.data) return <DetailPagePlaceholder loading={bucket.isLoading} />;

  const bucketInfo = bucket.data as Bucket;
  const entryItems = (bucketEntries.data?.items ?? []) as BucketEntry[];
  const ruleItems = (lifecycleRules.data?.items ?? []) as LifecycleRule[];
  const navigatePrefix = (target: string) => {
    setPrefix(target);
    setFolderName("");
  };
  const aclLabel = bucketInfo.acl === "tenant_read" ? "租户内读" : "私有";
  const storageClassLabel = bucketInfo.storage_class === "infrequent_access" ? "低频" : "标准";
  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "存储" },
          { label: "对象存储", to: "/objects" },
          { label: bucketInfo.name },
        ]}
        title={bucketInfo.name}
        status={<Tag color={bucketInfo.acl === "tenant_read" ? "blue" : "gray"}>{aclLabel}</Tag>}
        icon={<AliIcon name="duixiangcunchu1" size={28} />}
        headerItems={[
          {
            label: "对象数",
            value: String(bucketInfo.object_count ?? entryItems.length),
          },
          { label: "创建时间", value: formatDateTime(bucketInfo.created_at) },
        ]}
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [
              { label: "ID", value: <ResourceId value={bucketInfo.id} /> },
              { label: "名称", value: bucketInfo.name },
              { label: "权限", value: aclLabel },
              { label: "存储类型", value: storageClassLabel },
              {
                label: "对象数",
                value: bucketInfo.object_count ?? entryItems.length,
              },
              { label: "总大小", value: formatBytes(bucketInfo.size_bytes) },
              {
                label: "创建时间",
                value: formatDateTime(bucketInfo.created_at),
              },
              {
                label: "更新时间",
                value: formatDateTime(bucketInfo.updated_at),
              },
            ],
          },
        ]}
        defaultTabKey={tab}
        tabs={[
          {
            key: "objects",
            label: "对象浏览器",
            content: (
              <ObjectBrowser
                bucketName={bucketInfo.name}
                prefix={prefix}
                entries={entryItems}
                aclLabel={aclLabel}
                loading={bucketEntries.isLoading}
                actionLoading={generateLink.isPending}
                primaryAction={
                  <Upload
                    showUploadList={false}
                    customRequest={(opt) => {
                      upload.mutate(opt.file as File);
                    }}
                  >
                    <Button ref={uploadTriggerRef} type="primary" loading={upload.isPending}>
                      上传对象
                    </Button>
                  </Upload>
                }
                onNavigate={navigatePrefix}
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
            ),
          },
          {
            key: "permissions",
            label: "权限",
            content: (
              <Space direction="vertical" size={20} className="w-full">
                <Typography.Text type="secondary">
                  P0 支持私有与租户内读两档权限；跨账户 ACL 与桶策略编辑暂不在当前范围内。
                </Typography.Text>
                <Descriptions column={1} border data={[{ label: "当前权限", value: aclLabel }]} />
                <Space>
                  <Select
                    value={aclDraft ?? "private"}
                    onChange={setAclDraft}
                    style={{ width: 180 }}
                  >
                    <Select.Option value="private">私有</Select.Option>
                    <Select.Option value="tenant_read">租户内读</Select.Option>
                  </Select>
                  <Button
                    type="primary"
                    loading={updateAcl.isPending}
                    disabled={(aclDraft ?? "private") === (bucketInfo.acl ?? "private")}
                    onClick={() => updateAcl.mutateAsync(undefined)}
                  >
                    保存权限
                  </Button>
                </Space>
              </Space>
            ),
          },
          {
            key: "lifecycle",
            label: "生命周期",
            content: (
              <Space direction="vertical" size={12} className="w-full">
                <div className="flex w-full items-center justify-between">
                  <Typography.Text>
                    共 <Typography.Text bold>{ruleItems.length}</Typography.Text> 条生命周期规则
                  </Typography.Text>
                  <Button
                    type="primary"
                    onClick={() => {
                      setEditingRule(undefined);
                      setRuleVisible(true);
                    }}
                  >
                    添加规则
                  </Button>
                </div>
                <DataTable<LifecycleRule>
                  columns={[
                    { title: "名称", dataIndex: "name" },
                    {
                      title: "前缀",
                      dataIndex: "prefix",
                      placeholder: "全部",
                    },
                    {
                      title: "转低频天数",
                      dataIndex: "to_infrequent_days",
                    },
                    {
                      title: "过期天数",
                      dataIndex: "expire_days",
                    },
                    {
                      title: "状态",
                      width: 120,
                      render: (_, row) => (
                        <Tag color={row.enabled ? "green" : "gray"}>
                          {row.enabled ? "启用" : "停用"}
                        </Tag>
                      ),
                    },
                  ]}
                  data={ruleItems}
                  loading={lifecycleRules.isLoading}
                  pagination={false}
                  rowActions={[
                    {
                      key: "edit",
                      label: "编辑",
                      onClick: (row) => {
                        setEditingRule(row);
                        setRuleVisible(true);
                      },
                    },
                    {
                      key: "delete",
                      label: "删除",
                      intent: "danger",
                      loading: (row) => deleteRule.isPending && deleteRule.variables?.id === row.id,
                      onClick: (row) => {
                        Modal.confirm({
                          title: "删除生命周期规则",
                          content: `确定删除规则「${row.name}」？`,
                          okButtonProps: { status: "danger" },
                          onOk: () => deleteRule.mutateAsync(row),
                        });
                      },
                    },
                  ]}
                  noDataElement={<Empty description="暂无生命周期规则，点击「添加规则」开始" />}
                />
              </Space>
            ),
          },
          {
            key: "access",
            label: "访问信息",
            content: (
              <Space direction="vertical" size={20} className="w-full">
                <Typography.Text type="secondary">
                  以下信息用于 S3 兼容 SDK 与 CLI 接入。访问凭据由租户管理员统一提供。
                </Typography.Text>
                <Descriptions
                  column={1}
                  border
                  data={[
                    { label: "Region", value: bucketInfo.region ?? "-" },
                    {
                      label: "Endpoint",
                      value: (
                        <Space>
                          <Typography.Text code>{bucketInfo.endpoint ?? "-"}</Typography.Text>
                          {bucketInfo.endpoint ? (
                            <Button
                              type="text"
                              size="mini"
                              onClick={() => void copyToClipboard(bucketInfo.endpoint!, "Endpoint")}
                            >
                              复制
                            </Button>
                          ) : null}
                        </Space>
                      ),
                    },
                    { label: "桶名", value: bucketInfo.name },
                    {
                      label: "版本控制",
                      value: bucketInfo.versioning === "enabled" ? "开启" : "关闭",
                    },
                    { label: "存储类型", value: storageClassLabel },
                  ]}
                />
                <Space>
                  <Select
                    value={classDraft ?? "standard"}
                    onChange={setClassDraft}
                    style={{ width: 180 }}
                  >
                    <Select.Option value="standard">标准</Select.Option>
                    <Select.Option value="infrequent_access">低频</Select.Option>
                  </Select>
                  <Button
                    type="primary"
                    loading={updateClass.isPending}
                    disabled={
                      (classDraft ?? "standard") === (bucketInfo.storage_class ?? "standard")
                    }
                    onClick={() => updateClass.mutateAsync(undefined)}
                  >
                    保存存储类型
                  </Button>
                </Space>
              </Space>
            ),
          },
        ]}
        onBack={() => navigate({ to: "/objects" })}
      />
      <Modal
        visible={folderVisible}
        title="新建文件夹"
        onCancel={() => {
          setFolderVisible(false);
        }}
        onOk={() => createFolder.mutateAsync(undefined)}
        confirmLoading={createFolder.isPending}
        unmountOnExit
      >
        <Input
          value={folderName}
          onChange={setFolderName}
          placeholder="请输入文件夹名称"
          onPressEnter={() => createFolder.mutateAsync(undefined)}
        />
        <Typography.Text type="secondary" className="mt-3 block">
          将在当前路径「{prefix === "/" ? "桶根目录" : prefix}」下创建前缀。
        </Typography.Text>
      </Modal>
      <CreateLifecycleRuleModal
        visible={ruleVisible}
        bucketId={bucketId}
        rule={editingRule}
        onCancel={() => setRuleVisible(false)}
      />
    </>
  );
}
