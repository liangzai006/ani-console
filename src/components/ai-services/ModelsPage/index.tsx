import { Modal, Select, Space } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { deleteModel, listModels } from "@/api/ai-services/models";

import { CreateInferenceServiceModal } from "@/components/ai-services/CreateInferenceServiceModal";
import { ImportModelModal } from "@/components/ai-services/ImportModelModal";
import {
  ResourceNameId,
  ListPageFrame,
  StatusTag,
  type ListColumn,
  ListDataTable,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { formatBytes, formatDateTime } from "@/lib/format";
import { MODEL_SOURCE_LABELS, type Model } from "@/lib/ai-models";

type StatusFilter = "all" | "pending" | "available" | "importing" | "failed";
type SearchField = "name";
type SourceFilter = "all" | Model["source"];
type CapabilityFilter = "all" | "text-generation" | "embedding" | "speech-to-text";

function getApiStatus(status: StatusFilter) {
  if (status === "pending") return "pending" as const;
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
    errorNotification: {
      id: "models",
      action: "模型列表加载",
      fallback: "请求失败，请稍后重试",
    },
    queryKey: ["models", { status, searchText, source, capability }],
    cursorScope,
    fetchPage: async ({ cursor, limit }) => {
      const data = await listModels({
        limit,
        cursor,
        keyword: searchText.trim() || undefined,
        source: source === "all" ? undefined : source,
        capability: capability === "all" ? undefined : capability,
        status: getApiStatus(status),
      });
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

  const remove = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "model-delete",
        action: "删除模型",
        errorFallback: "删除模型失败",
      },
    },
    mutationFn: async (item: Model) => {
      await deleteModel(item.id);
      return item;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["models"] });
      refresh();
    },
  });

  const columns: Array<ListColumn<Model>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <ResourceNameId name={item.display_name || item.name} id={item.id} type="model" />
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
        header={{
          iconClassName: "icon-moxing",
          title: "模型仓库",
          subtitle: "统一管理模型 Catalog、版本与部署入口",
          actions: [
            {
              key: "header-action-1",
              label: "导入模型",
              iconClassName: "icon-add-1",
              variant: "primary",
              onClick: () => setImportVisible(true),
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
              value: "pending",
              label: "等待中",
            },
            {
              value: "available",
              label: "可用",
            },
            {
              value: "importing",
              label: "导入中",
            },
            {
              value: "failed",
              label: "失败",
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
            ],
            field: searchField,
            value: searchText,
            onFieldChange: setSearchField,
            onChange: setSearchText,
          },
          filters: (
            <Space wrap>
              <Select
                value={source}
                onChange={setSource}
                className="w-35"
                options={[
                  {
                    value: "all",
                    label: "全部来源",
                  },
                  {
                    value: "huggingface",
                    label: "HuggingFace",
                  },
                  {
                    value: "modelscope",
                    label: "ModelScope",
                  },
                  {
                    value: "upload",
                    label: "本地上传",
                  },
                  {
                    value: "builtin",
                    label: "内置",
                  },
                ]}
              />
              <Select
                value={capability}
                onChange={setCapability}
                className="w-35"
                options={[
                  {
                    value: "all",
                    label: "全部任务",
                  },
                  {
                    value: "text-generation",
                    label: "文本生成",
                  },
                  {
                    value: "embedding",
                    label: "文本向量化",
                  },
                  {
                    value: "speech-to-text",
                    label: "语音识别",
                  },
                ]}
              />
            </Space>
          ),
          refresh: {
            label: "刷新",
            spinning: models.isFetching,
            onClick: refresh,
          },
        }}
      >
        <ListDataTable
          data={items}
          columns={columns}
          rowActions={[
            {
              key: "deploy",
              label: "部署",
              disabled: (item) => item.status !== "ready",
              onClick: setDeployModel,
            },
            {
              key: "favorite",
              label: "收藏",
              disabled: () => true,
              tooltip: "等待后端开放收藏状态与操作接口",
              onClick: () => undefined,
            },
            {
              key: "add-version",
              label: "新增版本",
              disabled: () => true,
              tooltip: "等待后端确认测试环境的版本文件上传接口",
              onClick: () => undefined,
            },
            {
              key: "delete",
              label: "删除",
              intent: "danger",
              disabled: (item) => item.status === "deleted" || remove.isPending,
              onClick: (item) =>
                void Modal.confirm({
                  title: "删除模型",
                  content: `确定删除「${item.display_name || item.name}」？有关联推理服务时后端将拒绝删除。`,
                  okButtonProps: { status: "danger" },
                  onOk: () => remove.mutateAsync(item),
                }),
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
