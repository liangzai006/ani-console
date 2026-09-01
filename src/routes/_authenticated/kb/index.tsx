import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@arco-design/web-react";
import { useState } from "react";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { showApiError } from "@/api/helpers";
import { CreateKnowledgeBaseModal } from "@/components/knowledge/CreateKnowledgeBaseModal";
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

type KnowledgeBase = components["schemas"]["KnowledgeBase"];
type StatusFilter = "all" | "active" | "rebuilding";
type SearchField = "name" | "id";

export const Route = createFileRoute("/_authenticated/kb/")({
  component: KnowledgeBasesPage,
});

function KnowledgeBasesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const {
    query,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  } = useCursorPaginatedQuery<KnowledgeBase>({
    queryKey: ["knowledge-bases", { status, searchField, searchText }],
    cursorScope: `${status}:${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      const keyword = searchText.trim();
      // TODO: 待后端联调确认 status/name/id 查询参数及筛选后 total 的最终契约。
      const { data, error } = await servicesApi.GET("/knowledge-bases", {
        params: {
          query: {
            limit,
            cursor,
            status: status === "all" ? undefined : status,
            name: searchField === "name" && keyword ? keyword : undefined,
            id: searchField === "id" && keyword ? keyword : undefined,
          },
        },
      });
      if (error || !data) throw error ?? new Error("知识库列表未返回结果");
      return data;
    },
  });
  const remove = useMutation({
    mutationFn: async (item: KnowledgeBase) => {
      const { error } = await servicesApi.DELETE("/knowledge-bases/{kb_id}", {
        params: { path: { kb_id: item.id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      resetPagination();
      void qc.invalidateQueries({ queryKey: ["knowledge-bases"] });
    },
    onError: (error) => showApiError(error, "删除知识库失败"),
  });
  const items = query.data?.items ?? [];
  const paginationTotal = query.data?.total ?? items.length;
  useListErrorNotification({
    id: "knowledge-bases-list",
    title: "知识库列表加载失败",
    error: query.error,
  });
  const columns: Array<ListColumn<KnowledgeBase>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link
              to="/kb/$kbId"
              params={{ kbId: item.id }}
              search={{ tab: "overview" }}
            >
              {item.name}
            </Link>
          }
          id={item.id}
        />
      ),
    },
    {
      key: "status",
      title: "状态",
      width: 120,
      render: (_, item) => <StatusTag status={item.status} />,
    },
    {
      key: "docs",
      title: "文档数",
      render: (_, item) => item.doc_count ?? 0,
    },
    {
      key: "model",
      title: "Embedding 模型",
      render: (_, item) => item.embedding_model || "—",
    },
    {
      key: "topk",
      title: "TopK",
      render: (_, item) => item.top_k ?? "—",
    },
    {
      key: "created",
      title: "创建时间",
      render: (_, item) => formatDateTime(item.created_at),
    },
  ];
  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-zhishiku"
            title="知识库管理"
            subtitle="创建知识库、管理文档并验证知识问答"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setCreateVisible(true)}
              >
                创建知识库
              </ToolbarButton>
            }
          />
        }
        tabs={
          <StatusTabs
            value={status}
            onChange={(value) => {
              resetPagination();
              setStatus(value);
            }}
            items={[
              { value: "all", label: "全部" },
              { value: "active", label: "活跃" },
              {
                value: "rebuilding",
                label: "重建中",
              },
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
                onFieldChange={(value) => {
                  resetPagination();
                  setSearchField(value);
                }}
                onChange={(value) => {
                  resetPagination();
                  setSearchText(value);
                }}
              />
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={query.isFetching}
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
                  <DataTableRowActionButton
                    onClick={() =>
                      navigate({
                        to: "/kb/$kbId",
                        params: { kbId: item.id },
                        search: { tab: "chat" },
                      })
                    }
                  >
                    问答
                  </DataTableRowActionButton>
                  <DataTableRowActionButton
                    status="danger"
                    onClick={() =>
                      Modal.confirm({
                        title: "删除知识库",
                        content: `确定删除「${item.name}」？知识库及其文档将不可恢复。`,
                        okButtonProps: { status: "danger" },
                        onOk: () => remove.mutateAsync(item),
                      })
                    }
                  >
                    删除
                  </DataTableRowActionButton>
                </DataTableRowActions>
              ),
            },
          ]}
          loading={query.isFetching}
          emptyIconClassName="icon-zhishiku"
          emptyText={
            searchText || status !== "all"
              ? "没有符合条件的知识库"
              : "还没有知识库，可创建后上传文档并进行问答"
          }
          tableLabel="知识库列表"
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
      <CreateKnowledgeBaseModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
        onCreated={(item) =>
          navigate({
            to: "/kb/$kbId",
            params: { kbId: item.id },
            search: { tab: "overview" },
          })
        }
      />
    </>
  );
}
