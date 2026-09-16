import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import {
  deleteVectorStore,
  listVectorStores,
  rebuildVectorStoreIndex,
  type VectorStore,
} from "@/api/storage/vector-stores";

import { CreateVectorStoreModal } from "@/components/storage/CreateVectorStoreModal";
import {
  DataTableNameCell,
  ListPageFrame,
  type ListColumn,
  StatusTag,
  ListDataTable,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { formatDateTime } from "@/lib/format";

type StatusFilter = "all" | "ready" | "pending";
type SearchField = "name" | "id";

export function VectorStoresPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [createVisible, setCreateVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const {
    query: stores,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  } = useCursorPaginatedQuery<VectorStore>({
    errorNotification: {
      id: "vector-stores",
      action: "向量存储列表加载",
      fallback: "请求失败，请稍后重试",
    },
    queryKey: ["vector-stores", { status, searchField, searchText }],
    cursorScope: `${status}:${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      const keyword = searchText.trim();
      return listVectorStores({
        limit,
        cursor,
        status: status === "all" ? undefined : status,
        search_field: keyword ? searchField : undefined,
        keyword: keyword || undefined,
      });
    },
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
    mutationFn: (item: VectorStore) => deleteVectorStore(item.id),
    onSuccess: () => {
      resetPagination();
      void qc.invalidateQueries({ queryKey: ["vector-stores"] });
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
    mutationFn: (item: VectorStore) => rebuildVectorStoreIndex(item.id),
    onSuccess: (_, item) => {
      void qc.invalidateQueries({ queryKey: ["vector-stores"] });
      void qc.invalidateQueries({ queryKey: ["vector-store", item.id] });
    },
  });
  const items = useMemo(() => (stores.data?.items ?? []) as VectorStore[], [stores.data?.items]);
  const paginationTotal = stores.data?.total ?? items.length;
  const columns: Array<ListColumn<VectorStore>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link
              className="truncate"
              to="/vector-stores/$vectorStoreId"
              params={{ vectorStoreId: item.id }}
              search={{ tab: undefined }}
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
      render: (_, item) => <StatusTag status={item.state} />,
    },
    {
      key: "dimension",
      title: "维度",
      dataIndex: "dimension",
    },
    {
      key: "metric",
      title: "度量",
      render: (_, item) => item.metric.toUpperCase(),
    },
    {
      key: "embeddingModel",
      title: "Embedding 模型",
      ellipsis: true,
      dataIndex: "embedding_model",
      placeholder: "-",
    },
    {
      key: "vectorCount",
      title: "向量数",
      dataIndex: "vector_count",
      placeholder: 0,
    },
    {
      key: "knowledgeBase",
      title: "关联知识库",
      ellipsis: true,
      render: (_, item) =>
        item.knowledge_base_ref ? (
          <Link
            to="/kb/$kbId"
            params={{ kbId: item.knowledge_base_ref.id }}
            search={{ tab: "overview" }}
          >
            {item.knowledge_base_ref.name}
          </Link>
        ) : (
          "未关联"
        ),
    },
    {
      key: "createdAt",
      title: "创建时间",
      render: (_, item) => formatDateTime(item.created_at),
    },
  ];
  return (
    <>
      <ListPageFrame
        header={{
          iconClassName: "icon-xiangliangcunchu",
          title: "向量存储",
          subtitle: "管理用于语义检索和 AI 应用的向量数据",
          actions: [
            {
              key: "header-action-1",
              label: "创建向量存储",
              iconClassName: "icon-add-1",
              variant: "primary",
              onClick: () => setCreateVisible(true),
            },
          ],
        }}
        tabs={{
          value: status,
          onChange: setStatus,
          items: [
            {
              value: "all",
              label: "全部",
            },
            {
              value: "ready",
              label: "可用",
            },
            {
              value: "pending",
              label: "创建中",
            },
          ],
        }}
        toolbar={{
          search: {
            fields: [
              {
                value: "name",
                label: "名称",
              },
              {
                value: "id",
                label: "ID",
              },
            ],
            field: searchField,
            value: searchText,
            onFieldChange: setSearchField,
            onChange: setSearchText,
          },
          refresh: {
            label: "刷新",
            spinning: stores.isFetching,
            onClick: refresh,
          },
        }}
      >
        <ListDataTable
          data={items}
          columns={columns}
          rowActions={[
            {
              key: "search",
              label: "检索测试",
              disabled: (item) => item.state !== "ready",
              tooltip: (item) => (item.state === "ready" ? undefined : "仅可用状态支持检索测试"),
              onClick: (item) =>
                navigate({
                  to: "/vector-stores/$vectorStoreId",
                  params: { vectorStoreId: item.id },
                  search: { tab: "search" },
                }),
            },
            {
              key: "rebuild-index",
              label: (item) =>
                rebuildIndex.isPending && rebuildIndex.variables?.id === item.id
                  ? "重建中..."
                  : "重建索引",
              widthLabel: "重建索引",
              disabled: (item) =>
                item.state !== "ready" ||
                (rebuildIndex.isPending && rebuildIndex.variables?.id === item.id),
              tooltip: (item) => (item.state === "ready" ? undefined : "仅可用状态支持重建索引"),
              onClick: (item) =>
                void Modal.confirm({
                  title: "重建索引",
                  content: `确定重建「${item.name}」的索引？重建期间检索能力可能暂时受影响。`,
                  onOk: () => rebuildIndex.mutateAsync(item),
                }),
            },
            {
              key: "delete",
              label: "删除",
              intent: "danger",
              disabled: (item) => Boolean(item.knowledge_base_ref),
              tooltip: (item) =>
                item.knowledge_base_ref ? "请先解除知识库关联后再删除" : undefined,
              onClick: (item) =>
                void Modal.confirm({
                  title: "删除向量存储",
                  content: `确定删除「${item.name}」？其中的向量数据将不可恢复。`,
                  okButtonProps: { status: "danger" },
                  onOk: () => remove.mutateAsync(item),
                }),
            },
          ]}
          loading={stores.isFetching}
          emptyIconClassName="icon-xiangliangcunchu"
          emptyText={
            searchText || status !== "all"
              ? "没有符合条件的向量存储"
              : "还没有向量存储，点击「创建向量存储」开始"
          }
          tableLabel="向量存储列表"
          preserveTableOnEmpty
          pagination={{
            page,
            pageSize,
            total: paginationTotal,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </ListPageFrame>
      <CreateVectorStoreModal visible={createVisible} onCancel={() => setCreateVisible(false)} />
    </>
  );
}
