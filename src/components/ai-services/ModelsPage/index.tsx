import { Dropdown, Menu, Message, Modal, Select, Space } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { showApiError } from "@/api/helpers";
import { servicesApi } from "@/api/services-client";
import { CreateInferenceServiceModal } from "@/components/ai-services/CreateInferenceServiceModal";
import { ImportModelModal } from "@/components/ai-services/ImportModelModal";
import {
  DataTableNameCell,
  DataTableRowActionButton,
  DataTableRowActions,
  ListDataTable,
  ListPageFrame,
  ListPageHeader,
  ListToolbar,
  StatusTag,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatBytes, formatDateTime } from "@/lib/format";
import { MODEL_SOURCE_LABELS, type Model } from "@/lib/model-catalog";

type StatusFilter = "all" | "available" | "importing" | "failed";
type SearchField = "name";
type SourceFilter = "all" | Model["source"];
type CapabilityFilter = "all" | "text-generation" | "embedding" | "speech-to-text";

function getApiStatus(status: StatusFilter) {
  if (status === "available") return "ready" as const;
  if (status === "importing") return "downloading" as const;
  if (status === "failed") return "error" as const;
  return undefined;
}

export function ModelsPage() {
  const qc = useQueryClient();
  const [deployModel, setDeployModel] = useState<Model | null>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [capability, setCapability] = useState<CapabilityFilter>("all");
  const cursorPageRef = useRef(new Map<string, number>());
  const cursorScope = [status, searchText.trim(), source, capability].join(":");
  const {
    query: models,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  } = useCursorPaginatedQuery<Model>({
    queryKey: ["models", { status, searchText, source, capability }],
    cursorScope,
    fetchPage: async ({ cursor, limit }) => {
      const { data, error } = await servicesApi.GET("/models", {
        params: {
          query: {
            limit,
            cursor,
            keyword: searchText.trim() || undefined,
            source: source === "all" ? undefined : source,
            capability: capability === "all" ? undefined : capability,
            status: getApiStatus(status),
          },
        },
      });
      if (error || !data) throw error ?? new Error("模型列表未返回结果");
      const currentPage = cursor ? (cursorPageRef.current.get(cursorScope + ":" + cursor) ?? 1) : 1;
      if (data.next_cursor) {
        cursorPageRef.current.set(cursorScope + ":" + data.next_cursor, currentPage + 1);
      }
      const total =
        data.total ?? (currentPage - 1) * limit + data.items.length + (data.next_cursor ? 1 : 0);
      return { ...data, total };
    },
  });
  const items = models.data?.items ?? [];
  const paginationTotal = models.data?.total ?? items.length;

  useListErrorNotification({
    id: "models-list",
    title: "模型列表加载失败",
    error: models.error,
  });
  const remove = useMutation({
    mutationFn: async (item: Model) => {
      const { error } = await servicesApi.DELETE("/models/{model_id}", {
        params: { path: { model_id: item.id } },
      });
      if (error) throw error;
      return item;
    },
    onSuccess: (item) => {
      Message.success("模型「" + (item.display_name || item.name) + "」已删除");
      void qc.invalidateQueries({ queryKey: ["models"] });
      refresh();
    },
    onError: (error) => showApiError(error, "删除模型失败"),
  });

  const columns: Array<ListColumn<Model>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link to="/models/$modelId" params={{ modelId: item.id }}>
              {item.display_name || item.name}
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
      key: "source",
      title: "来源",
      render: (_, item) => MODEL_SOURCE_LABELS[item.source],
    },
    {
      key: "size",
      title: "大小",
      render: (_, item) => formatBytes(item.total_size_bytes),
    },
    {
      key: "updatedAt",
      title: "更新时间",
      render: (_, item) => formatDateTime(item.updated_at),
    },
  ];

  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-moxing"
            title="模型仓库"
            subtitle="统一管理模型 Catalog、版本与部署入口"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setImportVisible(true)}
              >
                导入模型
              </ToolbarButton>
            }
          />
        }
        tabs={
          <StatusTabs
            value={status}
            onChange={setStatus}
            items={[
              { value: "all", label: "全部" },
              { value: "available", label: "可用" },
              { value: "importing", label: "导入中" },
              { value: "failed", label: "失败" },
            ]}
          />
        }
        toolbar={
          <ListToolbar
            filters={
              <Space wrap>
                <ToolbarSearch
                  fields={[{ value: "name", label: "名称" }]}
                  field={searchField}
                  value={searchText}
                  onFieldChange={setSearchField}
                  onChange={setSearchText}
                />
                <Select
                  value={source}
                  onChange={setSource}
                  className="w-[140px]"
                  options={[
                    { value: "all", label: "全部来源" },
                    { value: "huggingface", label: "HuggingFace" },
                    { value: "modelscope", label: "ModelScope" },
                    { value: "upload", label: "本地上传" },
                    { value: "builtin", label: "内置" },
                  ]}
                />
                <Select
                  value={capability}
                  onChange={setCapability}
                  className="w-[140px]"
                  options={[
                    { value: "all", label: "全部任务" },
                    { value: "text-generation", label: "文本生成" },
                    { value: "embedding", label: "文本向量化" },
                    { value: "speech-to-text", label: "语音识别" },
                  ]}
                />
              </Space>
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={models.isFetching}
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
                    disabled={item.status !== "ready"}
                    onClick={() => setDeployModel(item)}
                  >
                    部署
                  </DataTableRowActionButton>
                  <Dropdown
                    trigger="click"
                    position="br"
                    droplist={
                      <Menu>
                        <Menu.Item key="favorite" disabled title="等待后端开放收藏状态与操作接口">
                          收藏
                        </Menu.Item>
                        <Menu.Item
                          key="add-version"
                          disabled
                          title="等待后端确认测试环境的版本文件上传接口"
                        >
                          新增版本
                        </Menu.Item>
                        <Menu.Item
                          key="delete"
                          disabled={item.status === "deleted" || remove.isPending}
                          style={{ color: "var(--color-danger-6)" }}
                          onClick={() =>
                            Modal.confirm({
                              title: "删除模型",
                              content:
                                "确定删除「" +
                                (item.display_name || item.name) +
                                "」？有关联推理服务时后端将拒绝删除。",
                              okButtonProps: { status: "danger" },
                              onOk: () => remove.mutateAsync(item),
                            })
                          }
                        >
                          删除
                        </Menu.Item>
                      </Menu>
                    }
                  >
                    <DataTableRowActionButton disabled={remove.isPending}>
                      更多
                      <i className="iconfont icon-down-chevron-small ml-1" aria-hidden="true" />
                    </DataTableRowActionButton>
                  </Dropdown>
                </DataTableRowActions>
              ),
            },
          ]}
          loading={models.isFetching}
          preserveTableOnEmpty
          emptyIconClassName="icon-moxing"
          emptyText={
            status !== "all" || searchText || source !== "all" || capability !== "all"
              ? "没有符合条件的模型"
              : "暂无模型，可通过“导入模型”添加"
          }
          tableLabel="模型仓库列表"
          pagination={{
            page,
            pageSize,
            total: paginationTotal,
            onPageChange: setPage,
            onPageSizeChange: (next) => {
              setPageSize(next);
              setPage(1);
            },
          }}
        />
      </ListPageFrame>
      <ImportModelModal
        visible={importVisible}
        onCancel={() => setImportVisible(false)}
        onSubmitted={() => {
          setStatus("all");
          resetPagination();
          refresh();
        }}
      />
      <CreateInferenceServiceModal
        visible={deployModel !== null}
        initialModelId={deployModel?.id}
        initialServiceName={deployModel ? ("infer-" + deployModel.name).slice(0, 63) : undefined}
        onCancel={() => setDeployModel(null)}
      />
    </>
  );
}
