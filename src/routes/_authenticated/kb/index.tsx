import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@arco-design/web-react";
import { useEffect, useMemo, useState } from "react";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { showApiError } from "@/api/helpers";
import { CreateKnowledgeBaseModal } from "@/components/knowledge/CreateKnowledgeBaseModal";
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
import { getErrorMessage } from "@/lib/errors";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const query = useQuery({
    queryKey: ["knowledge-bases"],
    queryFn: async () => {
      const { data, error } = await servicesApi.GET("/knowledge-bases");
      if (error) throw error;
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-bases"] }),
    onError: (error) => showApiError(error, "删除知识库失败"),
  });
  const items = (query.data?.items ?? []).filter(
    (item) => item.status !== "deleted",
  );
  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter((item) => item.status === "active").length,
      rebuilding: items.filter((item) => item.status === "rebuilding").length,
    }),
    [items],
  );
  const filtered = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return items.filter(
      (item) =>
        (status === "all" || item.status === status) &&
        (!keyword || item[searchField].toLowerCase().includes(keyword)),
    );
  }, [items, searchField, searchText, status]);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [searchField, searchText, status]);
  const columns: Array<ListColumn<KnowledgeBase>> = [
    {
      key: "name",
      title: "名称 / ID",
      minWidth: 240,
      render: (item) => (
        <ListNameCell
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
      render: (item) => <StatusTag status={item.status} />,
    },
    {
      key: "docs",
      title: "文档数",
      width: 100,
      render: (item) => item.doc_count ?? 0,
    },
    {
      key: "model",
      title: "Embedding 模型",
      minWidth: 180,
      render: (item) => item.embedding_model || "—",
    },
    {
      key: "topk",
      title: "TopK",
      width: 90,
      render: (item) => item.top_k ?? "—",
    },
    {
      key: "created",
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
            onChange={setStatus}
            items={[
              { value: "all", label: "全部", count: counts.all },
              { value: "active", label: "活跃", count: counts.active },
              {
                value: "rebuilding",
                label: "重建中",
                count: counts.rebuilding,
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
                onFieldChange={setSearchField}
                onChange={setSearchText}
              />
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={query.isFetching}
                onClick={() => void query.refetch()}
              />
            }
          />
        }
      >
        <DataTable
          rows={paged}
          rowKey={(item) => item.id}
          columns={columns}
          selectable={false}
          loading={query.isLoading}
          error={
            query.error
              ? getErrorMessage(query.error, "知识库列表加载失败")
              : null
          }
          onRetry={() => void query.refetch()}
          emptyIconClassName="icon-zhishiku"
          emptyText={
            searchText || status !== "all"
              ? "没有符合条件的知识库"
              : "还没有知识库，可创建后上传文档并进行问答"
          }
          tableLabel="知识库列表"
          preserveTableOnEmpty
          renderRowActions={(item) => (
            <ListRowActions>
              <ListRowActionButton
                onClick={() =>
                  navigate({
                    to: "/kb/$kbId",
                    params: { kbId: item.id },
                    search: { tab: "overview" },
                  })
                }
              >
                详情
              </ListRowActionButton>
              <ListRowActionButton
                onClick={() =>
                  navigate({
                    to: "/kb/$kbId",
                    params: { kbId: item.id },
                    search: { tab: "chat" },
                  })
                }
              >
                问答
              </ListRowActionButton>
              <ListRowActionButton
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
              </ListRowActionButton>
            </ListRowActions>
          )}
          pagination={{
            page,
            pageSize,
            total: filtered.length,
            onPageChange: setPage,
            onPageSizeChange: (next) => {
              setPageSize(next);
              setPage(1);
            },
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
