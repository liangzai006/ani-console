import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@arco-design/web-react";
import { useState } from "react";
import { deleteKnowledgeBase, listKnowledgeBases, type KnowledgeBase } from "@/api/knowledge";

import { CreateKnowledgeBaseModal } from "@/components/knowledge/CreateKnowledgeBaseModal";
import {
  DataTableNameCell,
  ListPageFrame,
  DataTableRowActionButton,
  DataTableRowActions,
  type ListColumn,
  StatusTag,
  ListDataTable,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { formatDateTime } from "@/lib/format";

type StatusFilter = "all" | "active" | "rebuilding";
type SearchField = "name" | "id";

export function KnowledgeBasesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const { query, page, pageSize, setPage, setPageSize, resetPagination, refresh } =
    useCursorPaginatedQuery<KnowledgeBase>({
      errorNotification: {
        id: "knowledge-bases",
        action: "知识库列表加载",
        fallback: "请求失败，请稍后重试",
      },
      queryKey: ["knowledge-bases", { status, searchField, searchText }],
      cursorScope: `${status}:${searchField}:${searchText.trim()}`,
      fetchPage: async ({ cursor, limit }) => {
        const keyword = searchText.trim();
        // TODO: 待后端联调确认 status/name/id 查询参数及筛选后 total 的最终契约。
        return listKnowledgeBases({
          limit,
          cursor,
          status: status === "all" ? undefined : status,
          name: searchField === "name" && keyword ? keyword : undefined,
          id: searchField === "id" && keyword ? keyword : undefined,
        });
      },
    });
  const remove = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "knowledge-base-delete",
        action: "删除知识库",
        errorFallback: "删除知识库失败",
      },
    },
    mutationFn: (item: KnowledgeBase) => deleteKnowledgeBase(item.id),
    onSuccess: () => {
      resetPagination();
      void qc.invalidateQueries({ queryKey: ["knowledge-bases"] });
    },
  });
  const items = query.data?.items ?? [];
  const paginationTotal = query.data?.total ?? items.length;
  const columns: Array<ListColumn<KnowledgeBase>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link to="/kb/$kbId" params={{ kbId: item.id }} search={{ tab: "overview" }}>
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
      dataIndex: "doc_count",
      width: 80,
      placeholder: 0,
    },
    {
      key: "model",
      title: "Embedding 模型",
      dataIndex: "embedding_model",
      placeholder: "-",
      ellipsis: true,
    },
    {
      key: "inference-model",
      title: "推理模型",
      dataIndex: "default_inference_service",
      placeholder: "-",
      ellipsis: true,
    },
    {
      key: "topk",
      title: "TopK",
      dataIndex: "top_k",
      width: 80,
      placeholder: "-",
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
        header={{
          iconClassName: "icon-zhishiku",
          title: "知识库管理",
          subtitle: "创建知识库、管理文档并验证知识问答",
          actions: [
            {
              key: "header-action-1",
              label: "创建知识库",
              iconClassName: "icon-add-1",
              variant: "primary",
              onClick: () => setCreateVisible(true),
            },
          ],
        }}
        tabs={{
          value: status,
          onChange: (value) => {
            resetPagination();
            setStatus(value);
          },
          items: [
            {
              value: "all",
              label: "全部",
            },
            {
              value: "active",
              label: "活跃",
            },
            {
              value: "rebuilding",
              label: "重建中",
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
            onFieldChange: (value) => {
              resetPagination();
              setSearchField(value);
            },
            onChange: (value) => {
              resetPagination();
              setSearchText(value);
            },
          },
          refresh: {
            label: "刷新",
            spinning: query.isFetching,
            onClick: refresh,
          },
        }}
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
                        params: {
                          kbId: item.id,
                        },
                        search: {
                          tab: "chat",
                        },
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
                        okButtonProps: {
                          status: "danger",
                        },
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
      <CreateKnowledgeBaseModal visible={createVisible} onCancel={() => setCreateVisible(false)} />
    </>
  );
}
