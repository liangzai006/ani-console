import { Link } from "@tanstack/react-router";
import {
  Dropdown,
  InputNumber,
  Menu,
  Message,
  Modal,
  Select,
  Space,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { components } from "@/api/services-schema";
import { servicesApi } from "@/api/services-client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { showApiError } from "@/api/helpers";
import { CreateInferenceServiceModal } from "@/components/ai-services/CreateInferenceServiceModal";
import {
  ListDataTable,
  DataTableNameCell,
  ListPageFrame,
  ListPageHeader,
  DataTableRowActionButton,
  DataTableRowActions,
  ListToolbar,
  StatusTag,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/common";
import { formatDateTime } from "@/lib/format";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

type InferenceService = components["schemas"]["InferenceService"];
type InferenceServiceListResponse = {
  items: InferenceService[];
  total?: number;
};
type StatusFilter = "all" | "running" | "deploying" | "stopped" | "failed";
type SearchField = "name" | "id";

export function InferencePage() {
  const qc = useQueryClient();
  const lifecycleScope = useIdempotencyScope("inference-service-lifecycle", [
    "POST",
  ]);
  const resizeScope = useIdempotencyScope("inference-service-resize", [
    "PATCH",
  ]);
  const [createVisible, setCreateVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [model, setModel] = useState("all");
  const [resizeTarget, setResizeTarget] = useState<InferenceService>();
  const [replicas, setReplicas] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const services = useQuery({
    queryKey: [
      "inference-services",
      { status, searchField, searchText, model, page, pageSize },
    ],
    queryFn: async () => {
      const keyword = searchText.trim();
      const request = servicesApi.GET as unknown as (
        path: string,
        options: { params: { query: never } },
      ) => Promise<{ data?: InferenceServiceListResponse; error?: unknown }>;
      const { data, error } = await request("/inference-services", {
        params: {
          query: asUncontractedQuery({
            limit: pageSize,
            offset: (page - 1) * pageSize,
            status: status === "all" ? undefined : status,
            model: model === "all" ? undefined : model,
            search_field: keyword ? searchField : undefined,
            keyword: keyword || undefined,
          }),
        },
      });
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
      const submitData = { action };
      const { data, error } = await servicesApi.POST(
        "/inference-services/{service_id}/lifecycle",
        {
          params: { path: { service_id: item.id } },
          body: lifecycleScope.withKey(submitData, [item.id]),
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      lifecycleScope.reset([variables.item.id]);
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
  const resize = useMutation({
    mutationFn: async (item: InferenceService) => {
      const submitData = { replicas };
      const { data, error } = await servicesApi.PATCH(
        "/inference-services/{service_id}",
        {
          params: { path: { service_id: item.id } },
          body: resizeScope.withKey(submitData, [item.id]),
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, item) => {
      resizeScope.reset([item.id]);
      Message.success("变配操作已提交");
      setResizeTarget(undefined);
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
    },
    onError: (error) => showApiError(error),
  });
  const items = useMemo(
    () => services.data?.items ?? [],
    [services.data?.items],
  );
  useListErrorNotification({
    id: "inference-services-list",
    title: "推理服务列表加载失败",
    error: services.error,
  });
  const modelOptions = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.model))).map((value) => ({
        value,
        label: value,
      })),
    [items],
  );
  useEffect(() => setPage(1), [model, searchField, searchText, status]);
  const columns: Array<ListColumn<InferenceService>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
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
      width: 120,
      render: (_, item) => <StatusTag status={item.status} />,
    },
    {
      key: "model",
      title: "模型版本",
      dataIndex: "model",
      ellipsis: true,
    },
    {
      key: "engine",
      title: "引擎",
      render: (_, item) => item.engine?.command?.join(" ") || "-",
      ellipsis: true,
    },
    {
      key: "replicas",
      title: "副本",
      width: 80,
      render: (_, item) => `${item.ready_replicas} / ${item.replicas}`,
    },
    {
      key: "gpu",
      title: "GPU",
      ellipsis: true,
      render: (_, item) => {
        const accelerator = item.resources?.accelerator;
        const gpuType = item.gpu_type ?? accelerator?.spec_id;
        const gpuCount =
          item.gpu_count_per_pod || accelerator?.count_per_replica;
        return gpuType && gpuCount ? `${gpuType} × ${gpuCount}` : "-";
      },
    },
    {
      key: "invocationUrl",
      title: "调用地址",
      render: (_, item) => item.invocation_url ?? item.endpoint_url ?? "-",
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
              { value: "all", label: "全部" },
              { value: "running", label: "运行中" },
              { value: "deploying", label: "部署中" },
              { value: "stopped", label: "已停止" },
              { value: "failed", label: "异常" },
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
                  className="w-55"
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
                  {item.status === "running" ? (
                    <DataTableRowActionButton
                      disabled={lifecycle.isPending}
                      onClick={() => lifecycle.mutate({ item, action: "stop" })}
                    >
                      停止
                    </DataTableRowActionButton>
                  ) : (
                    <DataTableRowActionButton
                      disabled={
                        item.status !== "stopped" || lifecycle.isPending
                      }
                      onClick={() =>
                        lifecycle.mutate({ item, action: "start" })
                      }
                    >
                      启动
                    </DataTableRowActionButton>
                  )}
                  <Dropdown
                    trigger="click"
                    position="br"
                    droplist={
                      <Menu
                        onClickMenuItem={(key) => {
                          if (key === "resize") {
                            setReplicas(item.replicas);
                            setResizeTarget(item);
                            return;
                          }
                          if (key !== "delete") return;
                          Modal.confirm({
                            title: "删除推理服务",
                            content: `确定删除「${item.name}」？删除请求提交后将异步停止并清理该服务。`,
                            okButtonProps: { status: "danger" },
                            onOk: () => remove.mutateAsync(item),
                          });
                        }}
                      >
                        <Menu.Item
                          key="resize"
                          disabled={item.status !== "running"}
                        >
                          变配
                        </Menu.Item>
                        <Menu.Item key="update-model-binding-policy" disabled>
                          更新模型绑定策略
                        </Menu.Item>
                        <Menu.Item key="delete">删除</Menu.Item>
                      </Menu>
                    }
                  >
                    <DataTableRowActionButton disabled={lifecycle.isPending}>
                      更多
                      <i
                        className="iconfont icon-down-chevron-small ml-1"
                        aria-hidden="true"
                      />
                    </DataTableRowActionButton>
                  </Dropdown>
                </DataTableRowActions>
              ),
            },
          ]}
          loading={services.isFetching}
          pagination={{
            page,
            pageSize,
            total: services.data?.total ?? items.length,
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
        />
      </ListPageFrame>
      <CreateInferenceServiceModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
      />
      <Modal
        visible={Boolean(resizeTarget)}
        title={resizeTarget ? `变配 · ${resizeTarget.name}` : "变配"}
        onCancel={() => {
          if (resizeTarget) resizeScope.reset([resizeTarget.id]);
          setResizeTarget(undefined);
        }}
        onOk={() =>
          resizeTarget ? resize.mutateAsync(resizeTarget) : undefined
        }
        confirmLoading={resize.isPending}
        unmountOnExit
      >
        <Space direction="vertical" size={12} className="w-full">
          <Typography.Text>期望副本数</Typography.Text>
          <InputNumber
            value={replicas}
            onChange={(value) => setReplicas(value ?? 1)}
            min={1}
            precision={0}
            className="w-full"
          />
          <Typography.Text type="secondary">
            当前后端变配接口仅支持调整副本数，操作将异步执行。
          </Typography.Text>
        </Space>
      </Modal>
    </>
  );
}
