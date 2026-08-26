import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Modal,
  Space,
  Spin,
  Tooltip,
} from "@arco-design/web-react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { DetailPageFrame } from "@/components/detailbase";
import { ApiErrorAlert } from "@/components/feedback/ApiErrorAlert";
import { AliIcon } from "@/components/icons/AliIcon";
import { StatusTag } from "@/components/shell/StatusTag";
import { VectorStoreWorkbench } from "@/components/storage/VectorStoreWorkbench";
import { formatDateTime } from "@/lib/format";

type VectorStore = components["schemas"]["VectorStore"];

export const Route = createFileRoute(
  "/_authenticated/vector-stores/$vectorStoreId",
)({ component: VectorStoreDetailPage });

function VectorStoreDetailPage() {
  const { vectorStoreId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["vector-store", vectorStoreId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET(
        "/vector-stores/{vector_store_id}",
        { params: { path: { vector_store_id: vectorStoreId } } },
      );
      if (error) throw error;
      return data;
    },
  });
  const remove = useMutation({
    mutationFn: async (_: undefined) => {
      const { error } = await coreApi.DELETE(
        "/vector-stores/{vector_store_id}",
        { params: { path: { vector_store_id: vectorStoreId } } },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vector-stores"] });
      navigate({ to: "/vector-stores" });
    },
    onError: (error) => showApiError(error),
  });
  if (detail.isLoading && !detail.data)
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    );
  if (detail.error || !detail.data)
    return (
      <ApiErrorAlert
        error={detail.error ?? new Error("向量存储不存在或无权访问")}
        title="向量存储加载失败"
      />
    );
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
      breadcrumbs={[
        { label: "存储" },
        { label: "向量存储", to: "/vector-stores" },
        { label: store.name },
      ]}
      title={store.name}
      status={storeStatus}
      icon={<AliIcon name="xiangliangcunchu" size={28} />}
      headerItems={[
        { label: "向量存储 ID", value: store.id },
        { label: "维度", value: store.dimension },
        { label: "创建时间", value: formatDateTime(store.created_at) },
      ]}
      actions={
        <Button
          status="danger"
          loading={remove.isPending}
          onClick={() =>
            Modal.confirm({
              title: "删除向量存储",
              content: `确定删除「${store.name}」？其中的向量数据将不可恢复。`,
              okButtonProps: { status: "danger" },
              onOk: () => remove.mutateAsync(undefined),
            })
          }
        >
          删除
        </Button>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: store.id },
            { label: "名称", value: store.name },
            { label: "状态", value: storeStatus },
            { label: "向量维度", value: store.dimension },
            { label: "距离度量", value: store.metric.toUpperCase() },
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
                  label: `知识库 · ${store.knowledge_base_ref.name}`,
                  value: (
                    <Link
                      to="/kb/$kbId"
                      params={{ kbId: store.knowledge_base_ref.id }}
                      search={{ tab: "overview" }}
                    >
                      打开
                    </Link>
                  ),
                },
              ]
            : [{ label: "暂无关联对象", value: "—" }],
        },
      ]}
      tabs={[
        {
          key: "index",
          label: "索引",
          content: (
            <Descriptions
              column={1}
              data={[
                { label: "索引状态", value: store.index_status || "—" },
                {
                  label: "维度 / 度量",
                  value: `${store.dimension} · ${store.metric}`,
                },
                {
                  label: "Embedding 模型",
                  value: store.embedding_model || "—",
                },
                { label: "向量数", value: store.vector_count ?? 0 },
                {
                  label: "最近索引",
                  value: store.last_indexed_at
                    ? formatDateTime(store.last_indexed_at)
                    : "—",
                },
              ]}
            />
          ),
        },
        {
          key: "search",
          label: "检索测试",
          content: <VectorStoreWorkbench store={store} />,
        },
        {
          key: "related",
          label: "关联",
          content: (
            <Space direction="vertical" size={12} className="w-full">
              <Alert
                type="info"
                showIcon
                content="删除向量存储前须解除知识库关联。"
              />
              <Descriptions
                column={1}
                data={[
                  {
                    label: "当前关联",
                    value: store.knowledge_base_ref ? (
                      <Link
                        to="/kb/$kbId"
                        params={{ kbId: store.knowledge_base_ref.id }}
                        search={{ tab: "overview" }}
                      >
                        {store.knowledge_base_ref.name}
                      </Link>
                    ) : (
                      "未关联"
                    ),
                  },
                ]}
              />
            </Space>
          ),
        },
        {
          key: "events",
          label: "事件",
          content: (
            <Space direction="vertical" size={12} className="w-full">
              {store.reason ? (
                <Alert type="warning" showIcon content={store.reason} />
              ) : null}
              <Empty description="当前 Core API 暂未提供向量存储事件列表" />
            </Space>
          ),
        },
      ]}
      onBack={() => navigate({ to: "/vector-stores" })}
    />
  );
}
