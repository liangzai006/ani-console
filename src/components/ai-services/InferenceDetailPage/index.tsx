import {
  DataTable,
  DetailPageFrame,
  AliIcon,
} from '@/components/common'
import { useNavigate } from "@tanstack/react-router";
import {
  Alert, Button, Empty, InputNumber, Message, Modal, Select, Space, Spin, Tooltip, Typography } from "@arco-design/web-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { components } from "@/api/services-schema";
import { servicesApi } from "@/api/services-client";
import { showApiError } from "@/api/helpers";
import { AiServiceStatusTag } from "@/components/ai-services/AiServiceStatusTag";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

type LifecycleAction = "start" | "stop" | "restart";
type InferenceLog = components["schemas"]["InferenceServiceLog"];

export function InferenceDetailPage({ serviceId }: { serviceId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lifecycleScope = useIdempotencyScope("inference-service-lifecycle", ["POST", serviceId]);
  const scaleScope = useIdempotencyScope("inference-service-scale", ["PATCH", serviceId]);
  const [scaleVisible, setScaleVisible] = useState(false);
  const [replicas, setReplicas] = useState(1);
  const [logLevel, setLogLevel] = useState<
    "all" | "debug" | "info" | "warn" | "error"
  >("all");
  const service = useQuery({
    queryKey: ["inference-service", serviceId],
    queryFn: async () => {
      const { data, error } = await servicesApi.GET(
        "/inference-services/{service_id}",
        { params: { path: { service_id: serviceId } } },
      );
      if (error) throw error;
      return data;
    },
  });
  useListErrorNotification({
    id: `inference-service-detail:${serviceId}`,
    title: "推理服务详情加载失败",
    error: service.error,
  });
  const logs = useQuery({
    queryKey: ["inference-service-logs", serviceId, logLevel],
    queryFn: async () => {
      const { data, error } = await servicesApi.GET(
        "/inference-services/{service_id}/logs",
        {
          params: {
            path: { service_id: serviceId },
            query: {
              limit: 200,
              ...(logLevel === "all" ? {} : { level: logLevel }),
            },
          },
        },
      );
      if (error) throw error;
      return data;
    },
  });
  const operationId = service.data?.current_operation_id ?? undefined;
  const operation = useQuery({
    queryKey: ["inference-operation", operationId],
    enabled: Boolean(operationId),
    queryFn: async () => {
      const { data, error } = await servicesApi.GET(
        "/inference-operations/{operation_id}",
        { params: { path: { operation_id: operationId! } } },
      );
      if (error) throw error;
      return data;
    },
  });
  const lifecycle = useMutation({
    mutationFn: async (action: LifecycleAction) => {
      const submitData = { action };
      const { data, error } = await servicesApi.POST(
        "/inference-services/{service_id}/lifecycle",
        {
          params: { path: { service_id: serviceId } },
          body: lifecycleScope.withKey(submitData),
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      lifecycleScope.reset();
      Message.success("生命周期操作已提交");
      void qc.invalidateQueries({ queryKey: ["inference-service", serviceId] });
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
    },
    onError: (error) => showApiError(error),
  });
  const scale = useMutation({
    mutationFn: async () => {
      const submitData = { replicas };
      const { data, error } = await servicesApi.PATCH(
        "/inference-services/{service_id}",
        {
          params: { path: { service_id: serviceId } },
          body: scaleScope.withKey(submitData),
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      scaleScope.reset();
      Message.success("扩缩容操作已提交");
      setScaleVisible(false);
      void qc.invalidateQueries({ queryKey: ["inference-service", serviceId] });
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
    },
    onError: (error) => showApiError(error),
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { data, error } = await servicesApi.DELETE(
        "/inference-services/{service_id}",
        { params: { path: { service_id: serviceId } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Message.success("删除操作已提交");
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
      navigate({ to: "/inference" });
    },
    onError: (error) => showApiError(error),
  });

  if (service.isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spin size={32} />
      </div>
    );
  if (!service.data)
    return (
      <DetailPageFrame
        breadcrumbs={[{ label: "AI" }, { label: "推理服务", to: "/inference" }, { label: serviceId }]}
        title={serviceId}
        icon={<AliIcon name="tuilifuwu" size={28} />}
        headerItems={[
          { label: "服务 ID", value: serviceId },
          { label: "状态", value: "-" },
          { label: "创建时间", value: "-" },
        ]}
        cards={[{ key: "basic", title: "基本信息", fields: [{ label: "服务 ID", value: serviceId }] }]}
      />
    );
  const item = service.data;
  const resources = item.resources;
  const accelerator = resources?.accelerator;
  const actions = (
    <Space wrap>
      {item.status === "running" ? (
        <Button onClick={() => lifecycle.mutate("stop")}>停止</Button>
      ) : null}
      {item.status === "stopped" ? (
        <Button onClick={() => lifecycle.mutate("start")}>启动</Button>
      ) : null}
      {item.status === "running" || item.status === "failed" ? (
        <Button onClick={() => lifecycle.mutate("restart")}>重启</Button>
      ) : null}
      {item.status === "running" ? (
        <Button
          onClick={() => {
            setReplicas(item.replicas);
            setScaleVisible(true);
          }}
        >
          扩缩容
        </Button>
      ) : null}
      <Button
        status="danger"
        onClick={() =>
          Modal.confirm({
            title: "删除推理服务",
            content: `确定删除「${item.name}」？删除请求提交后将异步停止并清理该服务。`,
            okButtonProps: { status: "danger" },
            onOk: () => remove.mutateAsync(),
          })
        }
      >
        删除
      </Button>
    </Space>
  );

  const statusDetail = [item.status_reason, item.status_message]
    .filter(Boolean)
    .join("：");
  const serviceStatus = statusDetail ? (
    <Tooltip content={statusDetail}>
      <span className="inline-flex">
        <AiServiceStatusTag status={item.status} />
      </span>
    </Tooltip>
  ) : (
    <AiServiceStatusTag status={item.status} />
  );

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "AI 服务" },
          { label: "推理服务", to: "/inference" },
          { label: item.name },
        ]}
        title={item.name}
        status={serviceStatus}
        icon={<AliIcon name="tuili" size={28} />}
        headerItems={[
          { label: "推理服务 ID", value: item.id },
          {
            label: "已就绪副本",
            value: `${item.ready_replicas} / ${item.replicas}`,
          },
          { label: "创建时间", value: formatDateTime(item.created_at) },
        ]}
        actions={actions}
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [
              { label: "ID", value: item.id },
              { label: "名称", value: item.name },
              {
                label: "状态",
                value: serviceStatus,
              },
              { label: "模型版本", value: item.model },
              { label: "模型版本 ID", value: item.model_version_id ?? "-" },
              { label: "服务模型名", value: item.served_model_name || "-" },
            ],
          },
          {
            key: "resources",
            title: "资源与部署",
            fields: [
              { label: "CPU", value: resources?.cpu ?? "-" },
              { label: "内存", value: resources?.memory ?? "-" },
              { label: "GPU 规格", value: accelerator?.spec_id ?? "-" },
              {
                label: "每副本 GPU",
                value: accelerator?.count_per_replica ?? "-",
              },
              {
                label: "GPU 显存",
                value: accelerator?.memory ? `${accelerator.memory} MiB` : "-",
              },
              {
                label: "部署模式",
                value:
                  { auto: "自动", single_node: "单节点", multi_node: "多节点" }[
                    item.placement_mode
                  ] ?? item.placement_mode,
              },
              { label: "期望副本", value: item.replicas },
              { label: "就绪副本", value: item.ready_replicas },
            ],
          },
          {
            key: "runtime",
            title: "运行信息",
            fields: [
              { label: "镜像 ID", value: item.image_id ?? "-" },
              { label: "镜像引用", value: item.image_ref ?? "-" },
              { label: "调用地址", value: item.invocation_url ?? "尚未提供" },
              { label: "配置代次", value: item.generation },
              { label: "已观察代次", value: item.observed_generation },
              { label: "更新时间", value: formatDateTime(item.updated_at) },
            ],
          },
        ]}
        tabs={[
          {
            key: "configuration",
            label: "运行配置",
            content: (
              <DataTable
                data={[
                  {
                    id: "resource",
                    type: "资源",
                    name: `${resources?.cpu ?? "-"} CPU / ${resources?.memory ?? "-"}`,
                    detail: accelerator
                      ? `${accelerator.spec_id} × ${accelerator.count_per_replica}`
                      : "CPU",
                  },
                  {
                    id: "image",
                    type: "镜像",
                    name: item.image_ref ?? item.image_id ?? "-",
                    detail: item.placement_mode,
                  },
                  {
                    id: "model",
                    type: "模型版本",
                    name: item.model,
                    detail: item.model_version_id ?? "-",
                  },
                ]}
                pagination={false}
                columns={[
                  { title: "类型", dataIndex: "type" },
                  { title: "名称", dataIndex: "name" },
                  { title: "说明", dataIndex: "detail" },
                ]}
              />
            ),
          },
          {
            key: "logs",
            label: "日志",
            extra: (
              <Space>
                <Select
                  size="small"
                  value={logLevel}
                  onChange={setLogLevel}
                  className="w-[120px]"
                  options={[
                    { value: "all", label: "全部级别" },
                    { value: "debug", label: "Debug" },
                    { value: "info", label: "Info" },
                    { value: "warn", label: "Warn" },
                    { value: "error", label: "Error" },
                  ]}
                />
                <Button
                  size="small"
                  loading={logs.isFetching}
                  onClick={() => void logs.refetch()}
                >
                  刷新
                </Button>
              </Space>
            ),
            content: logs.error ? (
              <Alert
                type="error"
                showIcon
                content={getErrorMessage(logs.error, "日志加载失败")}
              />
            ) : (
              <DataTable<InferenceLog>
                loading={logs.isFetching}
                data={logs.data?.items ?? []}
                rowKey={(row) =>
                  `${row.timestamp}-${row.container}-${row.message}`
                }
                pagination={false}
                noDataElement={<Empty description="暂无日志" />}
                columns={[
                  {
                    title: "时间",
                    render: (_, row) => formatDateTime(row.timestamp),
                  },
                  { title: "级别", dataIndex: "level" },
                  {
                    title: "容器",
                    render: (_, row) => row.container ?? "-",
                  },
                  { title: "消息", dataIndex: "message" },
                ]}
              />
            ),
          },
          {
            key: "operation",
            label: "当前操作",
            content: !operationId ? (
              <Empty description="当前没有执行中的操作" />
            ) : operation.error ? (
              <Alert
                type="error"
                showIcon
                content={getErrorMessage(operation.error, "操作状态加载失败")}
              />
            ) : operation.isLoading ? (
              <div className="flex justify-center py-12">
                <Spin />
              </div>
            ) : (
              <DataTable
                data={operation.data ? [operation.data] : []}
                pagination={false}
                columns={[
                  { title: "任务类型", dataIndex: "task_type" },
                  { title: "状态", width: 120, dataIndex: "status" },
                  { title: "进度", render: (_, row) => `${row.progress_pct}%` },
                  {
                    title: "创建时间",
                    render: (_, row) => formatDateTime(row.created_at),
                  },
                  {
                    title: "错误",
                    render: (_, row) => row.error_message ?? "-",
                  },
                ]}
              />
            ),
          },
        ]}
        onBack={() => navigate({ to: "/inference" })}
      />
      <Modal
        visible={scaleVisible}
        title="调整副本数"
        onCancel={() => setScaleVisible(false)}
        onOk={() => scale.mutateAsync()}
        confirmLoading={scale.isPending}
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
            扩缩容请求将异步执行，可在“当前操作”中查看进度。
          </Typography.Text>
        </Space>
      </Modal>
    </>
  );
}
