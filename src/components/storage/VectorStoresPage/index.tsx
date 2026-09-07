import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Message, Modal, Tooltip } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { CreateVectorStoreModal } from "@/components/storage/CreateVectorStoreModal";
import {
  ListDataTable,
  DataTableNameCell,
  ListPageFrame,
  ListPageHeader,
  DataTableRowActionButton,
  DataTableRowActions,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
  StatusTag,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatDateTime } from "@/lib/format";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

type VectorStore = components["schemas"]["VectorStore"];
type StatusFilter = "all" | "ready" | "pending";
type SearchField = "name" | "id";

export function VectorStoresPage() {
  const qc = useQueryClient();
  const rebuildScope = useIdempotencyScope("storage-vector-store-rebuild", [
    "POST",
  ]);
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
    queryKey: ["vector-stores", { status, searchField, searchText }],
    cursorScope: `${status}:${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      const keyword = searchText.trim();
      const { data, error } = await coreApi.GET("/vector-stores", {
        params: {
          query: asUncontractedQuery({
            limit,
            cursor,
            status: status === "all" ? undefined : status,
            search_field: keyword ? searchField : undefined,
            keyword: keyword || undefined,
          }),
        },
      });
      if (error || !data) throw error ?? new Error("向量存储列表未返回结果");
      return data;
    },
  });
  const remove = useMutation({
    mutationFn: async (item: VectorStore) => {
      const { error } = await coreApi.DELETE(
        "/vector-stores/{vector_store_id}",
        { params: { path: { vector_store_id: item.id } } },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      resetPagination();
      void qc.invalidateQueries({ queryKey: ["vector-stores"] });
    },
    onError: (error) => showApiError(error),
  });
  const rebuildIndex = useMutation({
    mutationFn: async (item: VectorStore) => {
      const submitData = {};
      const { error } = await coreApi.POST(
        "/vector-stores/{vector_store_id}/rebuild-index",
        {
          params: { path: { vector_store_id: item.id } },
          body: rebuildScope.withKey(submitData, [item.id]),
        },
      );
      if (error) throw error;
    },
    onSuccess: (_, item) => {
      rebuildScope.reset([item.id]);
      Message.success(`已提交「${item.name}」索引重建`);
      void qc.invalidateQueries({ queryKey: ["vector-stores"] });
      void qc.invalidateQueries({ queryKey: ["vector-store", item.id] });
    },
    onError: (error) => showApiError(error),
  });
  const items = useMemo(
    () => (stores.data?.items ?? []) as VectorStore[],
    [stores.data?.items],
  );
  const counts = useMemo(
    () => ({
      all: items.length,
      ready: items.filter((item) => item.state === "ready").length,
      pending: items.filter((item) => item.state === "pending").length,
    }),
    [items],
  );
  const paginationTotal = stores.data?.total ?? items.length;
  useListErrorNotification({
    id: "vector-stores-list",
    title: "向量存储列表加载失败",
    error: stores.error,
  });
  const columns: Array<ListColumn<VectorStore>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link
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
      dataIndex: "knowledge_base_ref.name",
      placeholder: "未关联",
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
                onClick={refresh}
              />
            }
          />
        }
      >
        <ListDataTable
          data={items}
          columns={[
            ...columns,
            {
              key: "__actions",
              title: "操作",
              fixed: "right",
              render: (_value, item) => (
                <DataTableRowActions>
                  <Tooltip
                    content={
                      item.state === "ready"
                        ? undefined
                        : "仅可用状态支持检索测试"
                    }
                  >
                    <span>
                      <DataTableRowActionButton
                        disabled={item.state !== "ready"}
                        onClick={() =>
                          navigate({
                            to: "/vector-stores/$vectorStoreId",
                            params: { vectorStoreId: item.id },
                            search: { tab: "search" },
                          })
                        }
                      >
                        检索测试
                      </DataTableRowActionButton>
                    </span>
                  </Tooltip>
                  <Tooltip
                    content={
                      item.state === "ready"
                        ? undefined
                        : "仅可用状态支持重建索引"
                    }
                  >
                    <span>
                      <DataTableRowActionButton
                        disabled={item.state !== "ready"}
                        loading={
                          rebuildIndex.isPending &&
                          rebuildIndex.variables?.id === item.id
                        }
                        onClick={() =>
                          Modal.confirm({
                            title: "重建索引",
                            content: `确定重建「${item.name}」的索引？重建期间检索能力可能暂时受影响。`,
                            onOk: () => rebuildIndex.mutateAsync(item),
                          })
                        }
                      >
                        重建索引
                      </DataTableRowActionButton>
                    </span>
                  </Tooltip>
                  <Tooltip
                    content={
                      item.knowledge_base_ref ? undefined : "当前未关联知识库"
                    }
                  >
                    <span>
                      <DataTableRowActionButton
                        disabled={!item.knowledge_base_ref}
                        onClick={() => {
                          if (!item.knowledge_base_ref) return;
                          navigate({
                            to: "/kb/$kbId",
                            params: { kbId: item.knowledge_base_ref.id },
                            search: { tab: "overview" },
                          });
                        }}
                      >
                        打开关联知识库
                      </DataTableRowActionButton>
                    </span>
                  </Tooltip>
                  <Tooltip
                    content={
                      item.knowledge_base_ref
                        ? "请先解除知识库关联后再删除"
                        : undefined
                    }
                  >
                    <span>
                      <DataTableRowActionButton
                        status="danger"
                        disabled={Boolean(item.knowledge_base_ref)}
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
                      </DataTableRowActionButton>
                    </span>
                  </Tooltip>
                </DataTableRowActions>
              ),
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
      <CreateVectorStoreModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
      />
    </>
  );
}
