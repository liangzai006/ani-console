import {
  deleteVectorStore,
  getVectorStore,
  rebuildVectorStoreIndex,
  type VectorStore,
} from "@/api/storage/vector-stores";
import { withId } from "@/lib/id";
import { Button, Dropdown, Menu, Modal, Tooltip } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import {
  AliIcon,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
  StatusTag,
} from "@/components/common";
import { navigationBreadcrumbsForPath } from "@/components/layouts/AppLayout/navigation";
import { VectorStoreWorkbench } from "@/components/storage/VectorStoreWorkbench";
import { formatDateTime } from "@/lib/format";
import { VectorStoreRelatedResources } from "./VectorStoreRelatedResources";

export type VectorStoreDetailTabKey = "search" | "related";

export function VectorStoreDetailPage({
  vectorStoreId,
  tab,
}: {
  vectorStoreId: string;
  tab?: VectorStoreDetailTabKey;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("vector-store", vectorStoreId),
        action: "向量存储加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["vector-store", vectorStoreId],
    queryFn: () => getVectorStore(vectorStoreId),
  });
  const remove = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "vector-store-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (_: undefined) => deleteVectorStore(vectorStoreId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vector-stores"] });
      navigate({ to: "/vector-stores" });
    },
  });
  const rebuildIndex = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "vector-index-rebuild",
        action: "重建",
        successText: "索引重建已提交",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (_: undefined) => rebuildVectorStoreIndex(vectorStoreId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vector-stores"] });
      void qc.invalidateQueries({ queryKey: ["vector-store", vectorStoreId] });
    },
  });
  if (!detail.data) return <DetailPagePlaceholder loading={detail.isLoading} />;
  const store = detail.data as VectorStore;
  const storeStatus = store.reason ? (
    <Tooltip content={store.reason}>
      <span className="inline-flex">
        <StatusTag status={store.state} />
      </span>
    </Tooltip>
  ) : (
    <StatusTag status={store.state} />
  );
  return (
    <DetailPageFrame
      breadcrumbs={[...navigationBreadcrumbsForPath("/vector-stores"), { label: store.name }]}
      title={store.name}
      status={storeStatus}
      icon={<AliIcon name="xiangliangcunchu" size={28} />}
      headerItems={[
        { label: "维度", value: String(store.dimension) },
        { label: "创建时间", value: formatDateTime(store.created_at) },
      ]}
      actions={
        <Dropdown
          trigger="click"
          position="br"
          droplist={
            <Menu
              onClickMenuItem={(key) => {
                if (key === "rebuild-index") {
                  void Modal.confirm({
                    title: "重建索引",
                    content: `确定重建「${store.name}」的索引？重建期间检索能力可能暂时受影响。`,
                    onOk: () => rebuildIndex.mutateAsync(undefined),
                  });
                  return;
                }
                if (key === "delete") {
                  void Modal.confirm({
                    title: "删除向量存储",
                    content: `确定删除「${store.name}」？其中的向量数据将不可恢复。`,
                    okButtonProps: { status: "danger" },
                    onOk: () => remove.mutateAsync(undefined),
                  });
                }
              }}
            >
              <Menu.Item
                key="rebuild-index"
                disabled={store.state !== "ready" || rebuildIndex.isPending || remove.isPending}
              >
                {rebuildIndex.isPending ? "重建中..." : "重建索引"}
              </Menu.Item>
              <Menu.Item
                key="delete"
                disabled={
                  Boolean(store.knowledge_base_ref) || remove.isPending || rebuildIndex.isPending
                }
                style={{ color: "var(--color-danger-6)" }}
              >
                删除
              </Menu.Item>
            </Menu>
          }
        >
          <Button
            loading={remove.isPending || rebuildIndex.isPending}
            aria-label="更多操作"
            title="更多操作"
          >
            <IconMoreVertical />
          </Button>
        </Dropdown>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: <ResourceId value={store.id} /> },
            { label: "名称", value: store.name },
            { label: "状态", value: storeStatus },
            { label: "向量维度", value: store.dimension },
            { label: "距离度量", value: store.metric.toUpperCase() },
            { label: "向量化模型", value: store.embedding_model || "-" },
            { label: "向量数", value: store.vector_count ?? 0 },
            {
              label: "最近索引",
              value: store.last_indexed_at ? formatDateTime(store.last_indexed_at) : "-",
            },
            { label: "创建时间", value: formatDateTime(store.created_at) },
            { label: "更新时间", value: formatDateTime(store.updated_at) },
          ],
        },
        {
          key: "related-summary",
          title: "关联摘要",
          fields: store.knowledge_base_ref
            ? [
                {
                  label: "知识库",
                  value: store.knowledge_base_ref.name,
                },
              ]
            : [{ label: "暂无关联对象", value: "-" }],
        },
      ]}
      tabs={[
        {
          key: "related",
          label: "关联资源",
          content: <VectorStoreRelatedResources store={store} />,
        },
        {
          key: "search",
          label: "检索",
          content: <VectorStoreWorkbench store={store} />,
        },
        /* 当前 Core API 未提供向量存储事件列表接口，保留代码待接口开放后恢复。
        {
          key: "events",
          label: "事件",
          content: (
            <Space direction="vertical" size={12} className="w-full">
              <Empty description="当前 Core API 暂未提供向量存储事件列表" />
            </Space>
          ),
        },
        */
      ]}
      defaultTabKey={tab}
      onBack={() => navigate({ to: "/vector-stores" })}
    />
  );
}
