import { createFileRoute } from "@tanstack/react-router";
import { Message, Select, Space } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import type { components } from "@/api/core-schema";
import { AiServiceStatusTag } from "@/components/ai-services/AiServiceStatusTag";
import { CreateInferenceServiceModal } from "@/components/ai-services/CreateInferenceServiceModal";
import {
  ListDataTable,
  DataTableNameCell,
  ListPageFrame,
  ListPageHeader,
  DataTableRowActionButton,
  DataTableRowActions,
  ListToolbar,
  StatusTabs,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/common";
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
  // TODO: 模型仓库接口准备完成后恢复 useCursorPaginatedQuery 与 /models 请求。
  const items: ModelCatalogItem[] = [];
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
  // TODO: 模型仓库接口接入后传递 status/source/task/searchField/searchText，目前不做本地过滤。
  const paginationTotal = 0;
  const columns: Array<ListColumn<ModelCatalogItem>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell name={item.display_name || item.name} id={item.id} />
      ),
    },
    {
      key: "status",
      title: "状态",
      width: 120,
      render: (_, item) => (
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
      render: (_, item) => SOURCE_LABELS[item.source] ?? item.source,
    },
    {
      key: "task",
      title: "任务",
      render: (_, item) =>
        item.capabilities
          .map((capability) => CAPABILITY_LABELS[capability] ?? capability)
          .join("、") || "—",
    },
    { key: "scale", title: "规模", render: () => "—" },
    {
      key: "version",
      title: "最新版本",
      render: (_, item) =>
        item.versions[item.versions.length - 1]?.version ?? "—",
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
                label="模型仓库接口尚未准备好"
                disabled
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
                    disabled={
                      item.status !== "ready" || item.versions.length === 0
                    }
                    onClick={() => setDeployModel(item)}
                  >
                    一键部署
                  </DataTableRowActionButton>
                  <DataTableRowActionButton
                    onClick={() => Message.success("已收藏")}
                  >
                    收藏
                  </DataTableRowActionButton>
                </DataTableRowActions>
              ),
            },
          ]}
          loading={false}
          preserveTableOnEmpty
          emptyIconClassName="icon-moxing"
          emptyText="模型仓库接口尚未准备好"
          tableLabel="模型仓库列表"
          pagination={{
            page,
            pageSize,
            total: paginationTotal,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
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
