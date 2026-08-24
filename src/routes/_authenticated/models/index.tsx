import { createFileRoute } from "@tanstack/react-router";
import { Message, Select, Space } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import type { components } from "@/api/core-schema";
import { AiServiceStatusTag } from "@/components/ai-services/AiServiceStatusTag";
import { CreateInferenceServiceModal } from "@/components/ai-services/CreateInferenceServiceModal";
import {
  DataTable,
  ListNameCell,
  ListPageFrame,
  ListPageHeader,
  ListRowActionButton,
  ListRowActions,
  ListToolbar,
  StatusTabs,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/pagebase";
import { getErrorMessage } from "@/lib/errors";
import { formatBytes, formatDateTime } from "@/lib/format";

type ModelCatalogItem = components["schemas"]["ModelCatalogItem"];
type StatusFilter = "all" | "available" | "importing" | "failed";
type SearchField = "name" | "id";

const SOURCE_LABELS: Record<string, string> = {
  upload: "本地上传",
  huggingface: "HuggingFace",
  modelscope: "ModelScope",
  builtin: "内置",
};

const CAPABILITY_LABELS: Record<string, string> = {
  "text-generation": "文本生成",
  embedding: "文本向量化",
  reranking: "重排序",
  "speech-to-text": "语音识别",
  ocr: "OCR",
};

export const Route = createFileRoute("/_authenticated/models/")({
  component: ModelsPage,
});

function ModelsPage() {
  const [deployModel, setDeployModel] = useState<ModelCatalogItem | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [source, setSource] = useState("all");
  const [task, setTask] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const models = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const items: ModelCatalogItem[] = [];
      let cursor: string | undefined;
      do {
        const { data, error } = await coreApi.GET("/models", {
          params: { query: { limit: 100, cursor } },
        });
        if (error) throw error;
        items.push(...(data?.items ?? []));
        cursor = data?.next_cursor ?? undefined;
      } while (cursor);
      return items;
    },
  });
  const items = models.data ?? [];
  const counts = useMemo(
    () => ({
      all: items.length,
      available: items.filter((item) => item.status === "ready").length,
      importing: items.filter(
        (item) => item.status === "pending" || item.status === "downloading",
      ).length,
      failed: items.filter((item) => item.status === "error").length,
    }),
    [items],
  );
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus =
        status === "all" ||
        (status === "available" && item.status === "ready") ||
        (status === "importing" &&
          (item.status === "pending" || item.status === "downloading")) ||
        (status === "failed" && item.status === "error");
      const searchValue =
        searchField === "name" ? `${item.display_name} ${item.name}` : item.id;
      return (
        matchesStatus &&
        (source === "all" || item.source === source) &&
        (task === "all" || item.capabilities.includes(task)) &&
        (!keyword || searchValue.toLowerCase().includes(keyword))
      );
    });
  }, [items, searchField, searchText, source, status, task]);
  useEffect(() => setPage(1), [searchField, searchText, source, status, task]);
  const columns: Array<ListColumn<ModelCatalogItem>> = [
    {
      key: "name",
      title: "名称 / ID",
      minWidth: 260,
      render: (item) => (
        <ListNameCell name={item.display_name || item.name} id={item.id} />
      ),
    },
    {
      key: "status",
      title: "状态",
      width: 110,
      render: (item) => (
        <AiServiceStatusTag
          status={
            item.status === "ready"
              ? "available"
              : item.status === "error"
                ? "failed"
                : item.status === "pending" || item.status === "downloading"
                  ? "importing"
                  : item.status
          }
        />
      ),
    },
    {
      key: "source",
      title: "来源",
      width: 130,
      render: (item) => SOURCE_LABELS[item.source] ?? item.source,
    },
    {
      key: "task",
      title: "任务",
      minWidth: 140,
      render: (item) =>
        item.capabilities
          .map((capability) => CAPABILITY_LABELS[capability] ?? capability)
          .join("、") || "—",
    },
    { key: "scale", title: "规模", width: 90, render: () => "—" },
    {
      key: "version",
      title: "最新版本",
      width: 110,
      render: (item) => item.versions[item.versions.length - 1]?.version ?? "—",
    },
    {
      key: "size",
      title: "大小",
      width: 100,
      render: (item) => formatBytes(item.total_size_bytes),
    },
    {
      key: "updatedAt",
      title: "更新时间",
      minWidth: 170,
      render: (item) => formatDateTime(item.updated_at),
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
          />
        }
        tabs={
          <StatusTabs
            value={status}
            onChange={setStatus}
            items={[
              { value: "all", label: "全部", count: counts.all },
              { value: "available", label: "可用", count: counts.available },
              { value: "importing", label: "导入中", count: counts.importing },
              { value: "failed", label: "失败", count: counts.failed },
            ]}
          />
        }
        toolbar={
          <ListToolbar
            filters={
              <Space wrap>
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
                  value={task}
                  onChange={setTask}
                  className="w-[140px]"
                  options={[
                    { value: "all", label: "全部任务" },
                    { value: "text-generation", label: "文本生成" },
                    { value: "embedding", label: "文本向量化" },
                    { value: "reranking", label: "重排序" },
                    { value: "speech-to-text", label: "语音识别" },
                    { value: "ocr", label: "OCR" },
                  ]}
                />
              </Space>
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={models.isFetching}
                onClick={() => void models.refetch()}
              />
            }
          />
        }
      >
        <DataTable
          rows={filteredItems.slice((page - 1) * pageSize, page * pageSize)}
          rowKey={(item) => item.id}
          columns={columns}
          selectable={false}
          loading={models.isLoading}
          error={
            models.error
              ? getErrorMessage(models.error, "模型仓库列表加载失败")
              : null
          }
          onRetry={() => void models.refetch()}
          preserveTableOnEmpty
          emptyIconClassName="icon-moxing"
          emptyText={
            searchText || source !== "all" || task !== "all" || status !== "all"
              ? "没有符合条件的模型"
              : "还没有模型，可导入或本地上传"
          }
          tableLabel="模型仓库列表"
          renderRowActions={(item) => (
            <ListRowActions>
              <ListRowActionButton
                disabled={item.status !== "ready" || item.versions.length === 0}
                onClick={() => setDeployModel(item)}
              >
                一键部署
              </ListRowActionButton>
              <ListRowActionButton onClick={() => Message.success("已收藏")}>
                收藏
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
      <CreateInferenceServiceModal
        visible={deployModel !== null}
        initialServiceName={
          deployModel ? `infer-${deployModel.name}`.slice(0, 63) : undefined
        }
        initialModelVersionId={
          deployModel?.versions[deployModel.versions.length - 1]?.id
        }
        onCancel={() => setDeployModel(null)}
      />
    </>
  );
}
