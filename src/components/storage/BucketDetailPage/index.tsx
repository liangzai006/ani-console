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
  Dropdown,
  Empty,
  Input,
  Menu,
  Modal,
  Space,
  Tag,
  Typography,
  Upload,
} from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useEffect, useRef, useState } from "react";
import {
  createBucketPrefix,
  deleteBucketLifecycleRule,
  deleteBucketObject,
  generateBucketObjectPresignedUrl,
  getBucket,
  listBucketLifecycleRules,
  listBucketObjects,
  type StorageBucketLifecycleRule,
  type StorageBucketObjectEntry,
  type StorageBucketRecord,
} from "@/api/storage/buckets";
import { uploadStorageObjectFile } from "@/api/storage/objects";

import { CreateLifecycleRuleModal } from "@/components/storage/CreateLifecycleRuleModal";
import { BucketAclEditor } from "@/components/storage/BucketAclEditor";
import { BucketStorageClassModal } from "@/components/storage/BucketStorageClassModal";
import { ObjectBrowser } from "@/components/storage/ObjectBrowser";
import { copyToClipboard } from "@/lib/clipboard";
import { formatBytes, formatDateTime } from "@/lib/format";
import { withId } from "@/lib/id";

type Bucket = StorageBucketRecord;
type BucketEntry = StorageBucketObjectEntry;
type LifecycleRule = StorageBucketLifecycleRule;
type AccessDomainRow = {
  key: "region" | "endpoint" | "bucket";
  type: string;
  address: string;
  copyable?: boolean;
};

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
  const [storageClassVisible, setStorageClassVisible] = useState(false);

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
  const accessDomainRows: AccessDomainRow[] = [
    { key: "region", type: "地域", address: bucketInfo.region ?? "-" },
    {
      key: "endpoint",
      type: "Endpoint",
      address: bucketInfo.endpoint ?? "-",
      copyable: Boolean(bucketInfo.endpoint),
    },
    { key: "bucket", type: "存储桶名称", address: bucketInfo.name },
  ];
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
        actions={
          <Dropdown
            trigger="click"
            position="br"
            droplist={
              <Menu
                onClickMenuItem={(key) => {
                  if (key !== "storage-class") return;
                  setStorageClassVisible(true);
                }}
              >
                <Menu.Item key="storage-class">存储类型</Menu.Item>
              </Menu>
            }
          >
            <Button aria-label="更多操作" title="更多操作">
              <IconMoreVertical />
            </Button>
          </Dropdown>
        }
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [
              { label: "存储桶ID", value: <ResourceId value={bucketInfo.id} /> },
              { label: "存储桶名称", value: bucketInfo.name },
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
            label: "文件",
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
            label: "权限管理",
            content: <BucketAclEditor bucket={bucketInfo} />,
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
            label: "访问域名",
            content: (
              <Space direction="vertical" size={20} className="w-full">
                <Typography.Title heading={6}>访问域名</Typography.Title>
                <DataTable<AccessDomainRow>
                  tableLabel="访问域名"
                  rowKey="key"
                  pagination={false}
                  data={accessDomainRows}
                  columns={[
                    { title: "类型", dataIndex: "type", width: 240 },
                    {
                      title: "地址",
                      render: (_, row) => (
                        <Space>
                          <Typography.Text>{row.address}</Typography.Text>
                          {row.copyable ? (
                            <Button
                              size="mini"
                              onClick={() => void copyToClipboard(row.address, "Endpoint")}
                            >
                              复制
                            </Button>
                          ) : null}
                        </Space>
                      ),
                    },
                  ]}
                />
              </Space>
            ),
          },
        ]}
        onBack={() => navigate({ to: "/objects" })}
      />
      <BucketStorageClassModal
        bucket={bucketInfo}
        visible={storageClassVisible}
        onCancel={() => setStorageClassVisible(false)}
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
