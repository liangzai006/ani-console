import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@arco-design/web-react";
import { useEffect, useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { CreateVectorStoreModal } from "@/components/storage/CreateVectorStoreModal";
import {
  DataTable,
  ListNameCell,
  ListPageFrame,
  ListPageHeader,
  ListRowActionButton,
  ListRowActions,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/pagebase";
import { StatusTag } from "@/components/shell/StatusTag";
import { listOrThrow } from "@/lib/api-list";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";

type VectorStore = components["schemas"]["VectorStore"];
type StatusFilter = "all" | "ready" | "pending";
type SearchField = "name" | "id";

export const Route = createFileRoute("/_authenticated/vector-stores/")({
  component: VectorStoresPage,
});

function VectorStoresPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const stores = useQuery({
    queryKey: ["vector-stores"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/vector-stores", { params: { query: { limit: 100 } } }),
      ),
  });
  const remove = useMutation({
    mutationFn: async (item: VectorStore) => {
      const { error } = await coreApi.DELETE(
        "/vector-stores/{vector_store_id}",
        { params: { path: { vector_store_id: item.id } } },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vector-stores"] }),
    onError: (error) => showApiError(error),
  });
  const items = (stores.data?.items ?? []) as VectorStore[];
  const counts = useMemo(
    () => ({
      all: items.length,
      ready: items.filter((item) => item.state === "ready").length,
      pending: items.filter((item) => item.state === "pending").length,
    }),
    [items],
  );
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return items.filter(
      (item) =>
        (status === "all" || item.state === status) &&
        (!keyword || String(item[searchField]).toLowerCase().includes(keyword)),
    );
  }, [items, searchField, searchText, status]);
  const pagedItems = filteredItems.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  useEffect(() => setPage(1), [searchField, searchText, status]);
  const columns: Array<ListColumn<VectorStore>> = [
    {
      key: "name",
      title: "名称 / ID",
      minWidth: 240,
      render: (item) => (
        <ListNameCell
          name={
            <Link
              to="/vector-stores/$vectorStoreId"
              params={{ vectorStoreId: item.id }}
            >
              {item.name}
            </Link>
          }
          id={item.id}
        />
      ),
    },
    {
      key: "state",
      title: "状态",
      width: 120,
      render: (item) => <StatusTag status={item.state} />,
    },
    {
      key: "dimension",
      title: "维度",
      width: 120,
      render: (item) => item.dimension,
    },
    {
      key: "metric",
      title: "度量",
      width: 120,
      render: (item) => item.metric.toUpperCase(),
    },
    {
      key: "embeddingModel",
      title: "Embedding 模型",
      minWidth: 180,
      render: (item) => item.embedding_model || "—",
    },
    {
      key: "vectorCount",
      title: "向量数",
      width: 120,
      render: (item) => item.vector_count ?? 0,
    },
    {
      key: "knowledgeBase",
      title: "关联知识库",
      minWidth: 180,
      render: (item) => item.knowledge_base_ref?.name || "未关联",
    },
    {
      key: "createdAt",
      title: "创建时间",
      minWidth: 190,
      render: (item) => formatDateTime(item.created_at),
    },
  ];
  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-xiangliangcunchu"
            title="向量存储"
            subtitle="管理用于语义检索和 AI 应用的向量数据"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setCreateVisible(true)}
              >
                创建向量存储
              </ToolbarButton>
            }
          />
        }
        tabs={
          <StatusTabs
            value={status}
            onChange={setStatus}
            items={[
              { value: "all", label: "全部", count: counts.all },
              { value: "ready", label: "可用", count: counts.ready },
              { value: "pending", label: "创建中", count: counts.pending },
            ]}
          />
        }
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSearch
                fields={[
                  { value: "name", label: "名称" },
                  { value: "id", label: "ID" },
                ]}
                field={searchField}
                value={searchText}
                onFieldChange={setSearchField}
                onChange={setSearchText}
              />
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={stores.isFetching}
                onClick={() => void stores.refetch()}
              />
            }
          />
        }
      >
        <DataTable
          rows={pagedItems}
          rowKey={(item) => item.id}
          columns={columns}
          selectable={false}
          loading={stores.isLoading}
          error={
            stores.error
              ? getErrorMessage(stores.error, "向量存储列表加载失败")
              : null
          }
          onRetry={() => void stores.refetch()}
          emptyIconClassName="icon-xiangliangcunchu"
          emptyText={
            searchText || status !== "all"
              ? "没有符合条件的向量存储"
              : "还没有向量存储，点击「创建向量存储」开始"
          }
          tableLabel="向量存储列表"
          preserveTableOnEmpty
          renderRowActions={(item) => (
            <ListRowActions>
              <ListRowActionButton
                onClick={() =>
                  navigate({
                    to: "/vector-stores/$vectorStoreId",
                    params: { vectorStoreId: item.id },
                  })
                }
              >
                详情
              </ListRowActionButton>
              <ListRowActionButton
                status="danger"
                onClick={() =>
                  Modal.confirm({
                    title: "删除向量存储",
                    content: `确定删除「${item.name}」？其中的向量数据将不可恢复。`,
                    okButtonProps: { status: "danger" },
                    onOk: () => remove.mutateAsync(item),
                  })
                }
              >
                删除
              </ListRowActionButton>
            </ListRowActions>
          )}
          pagination={{
            page,
            pageSize,
            total: filteredItems.length,
            onPageChange: setPage,
            onPageSizeChange: (next) => {
              setPageSize(next);
              setPage(1);
            },
          }}
        />
      </ListPageFrame>
      <CreateVectorStoreModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
      />
    </>
  );
}
