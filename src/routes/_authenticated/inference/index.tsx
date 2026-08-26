import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Message, Modal, Select, Space } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { components } from "@/api/services-schema";
import { servicesApi } from "@/api/services-client";
import { showApiError } from "@/api/helpers";
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
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/common";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";

type InferenceService = components["schemas"]["InferenceService"];
type StatusFilter = "all" | "running" | "deploying" | "stopped" | "failed";
type SearchField = "name" | "id";

export const Route = createFileRoute("/_authenticated/inference/")({
  component: InferencePage,
});

function InferencePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [model, setModel] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const services = useQuery({
    queryKey: ["inference-services"],
    queryFn: async () => {
      const { data, error } = await servicesApi.GET("/inference-services");
      if (error) throw error;
      return data;
    },
  });
  const lifecycle = useMutation({
    mutationFn: async ({
      item,
      action,
    }: {
      item: InferenceService;
      action: "start" | "stop" | "restart";
    }) => {
      const { data, error } = await servicesApi.POST(
        "/inference-services/{service_id}/lifecycle",
        {
          params: { path: { service_id: item.id } },
          body: { idempotency_key: newIdempotencyKey(), action },
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Message.success("生命周期操作已提交");
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
    },
    onError: (error) => showApiError(error),
  });
  const remove = useMutation({
    mutationFn: async (item: InferenceService) => {
      const { data, error } = await servicesApi.DELETE(
        "/inference-services/{service_id}",
        { params: { path: { service_id: item.id } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Message.success("删除操作已提交");
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
    },
    onError: (error) => showApiError(error),
  });
  const items = services.data?.items ?? [];
  const counts = useMemo(
    () => ({
      all: items.length,
      running: items.filter((item) => item.status === "running").length,
      deploying: items.filter(
        (item) => item.status === "pending" || item.status === "deploying",
      ).length,
      stopped: items.filter(
        (item) => item.status === "stopping" || item.status === "stopped",
      ).length,
      failed: items.filter((item) => item.status === "failed").length,
    }),
    [items],
  );
  const modelOptions = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.model))).map((value) => ({
        value,
        label: value,
      })),
    [items],
  );
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus =
        status === "all" ||
        (status === "deploying"
          ? item.status === "pending" || item.status === "deploying"
          : status === "stopped"
            ? item.status === "stopping" || item.status === "stopped"
            : item.status === status);
      return (
        matchesStatus &&
        (model === "all" || item.model === model) &&
        (!keyword || item[searchField].toLowerCase().includes(keyword))
      );
    });
  }, [items, model, searchField, searchText, status]);
  useEffect(() => setPage(1), [model, searchField, searchText, status]);
  const columns: Array<ListColumn<InferenceService>> = [
    {
      key: "name",
      title: "名称 / ID",
      minWidth: 240,
      render: (item) => (
        <ListNameCell
          name={
            <Link to="/inference/$serviceId" params={{ serviceId: item.id }}>
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
      width: 110,
      render: (item) => <AiServiceStatusTag status={item.status} />,
    },
    {
      key: "model",
      title: "模型版本",
      minWidth: 220,
      render: (item) => item.model,
    },
    {
      key: "resources",
      title: "资源规格",
      minWidth: 190,
      render: (item) =>
        item.resources
          ? `${item.resources.cpu} CPU / ${item.resources.memory}${item.resources.accelerator ? ` / ${item.resources.accelerator.spec_id} × ${item.resources.accelerator.count_per_replica}` : ""}`
          : "—",
    },
    {
      key: "replicas",
      title: "副本",
      width: 110,
      render: (item) => `${item.ready_replicas} / ${item.replicas}`,
    },
    {
      key: "placement",
      title: "部署模式",
      width: 120,
      render: (item) =>
        ({ auto: "自动", single_node: "单节点", multi_node: "多节点" })[
          item.placement_mode
        ] ?? item.placement_mode,
    },
    {
      key: "createdAt",
      title: "创建时间",
      minWidth: 180,
      render: (item) => formatDateTime(item.created_at),
    },
  ];
  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-tuili"
            title="推理服务"
            subtitle="部署模型并管理推理运行实例"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setCreateVisible(true)}
              >
                一键部署
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
              { value: "running", label: "运行中", count: counts.running },
              { value: "deploying", label: "部署中", count: counts.deploying },
              { value: "stopped", label: "已停止", count: counts.stopped },
              { value: "failed", label: "异常", count: counts.failed },
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
                  value={model}
                  onChange={setModel}
                  className="w-[220px]"
                  options={[
                    { value: "all", label: "全部模型" },
                    ...modelOptions,
                  ]}
                />
              </Space>
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={services.isFetching}
                onClick={() => void services.refetch()}
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
          loading={services.isLoading}
          error={
            services.error
              ? getErrorMessage(services.error, "推理服务列表加载失败")
              : null
          }
          onRetry={() => void services.refetch()}
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
          preserveTableOnEmpty
          emptyIconClassName="icon-tuili"
          emptyText={
            searchText || model !== "all" || status !== "all"
              ? "没有符合条件的推理服务"
              : "还没有推理服务，可从模型仓库一键部署"
          }
          tableLabel="推理服务列表"
          renderRowActions={(item) => (
            <ListRowActions>
              <ListRowActionButton
                onClick={() =>
                  navigate({
                    to: "/inference/$serviceId",
                    params: { serviceId: item.id },
                  })
                }
              >
                详情
              </ListRowActionButton>
              {item.status === "running" ? (
                <ListRowActionButton
                  onClick={() => lifecycle.mutate({ item, action: "stop" })}
                >
                  停止
                </ListRowActionButton>
              ) : null}
              {item.status === "stopped" ? (
                <ListRowActionButton
                  onClick={() => lifecycle.mutate({ item, action: "start" })}
                >
                  启动
                </ListRowActionButton>
              ) : null}
              {item.status === "failed" ? (
                <ListRowActionButton
                  onClick={() => lifecycle.mutate({ item, action: "restart" })}
                >
                  重启
                </ListRowActionButton>
              ) : null}
              <ListRowActionButton
                status="danger"
                onClick={() =>
                  Modal.confirm({
                    title: "删除推理服务",
                    content: `确定删除「${item.name}」？删除请求提交后将异步停止并清理该服务。`,
                    okButtonProps: { status: "danger" },
                    onOk: () => remove.mutateAsync(item),
                  })
                }
              >
                删除
              </ListRowActionButton>
            </ListRowActions>
          )}
        />
      </ListPageFrame>
      <CreateInferenceServiceModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
      />
    </>
  );
}
