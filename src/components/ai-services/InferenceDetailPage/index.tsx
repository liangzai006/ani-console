import {
  Button,
  Empty,
  InputNumber,
  Message,
  Modal,
  Space,
  Spin,
  Tooltip,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { showApiError } from "@/api/helpers";
import { servicesApi } from "@/api/services-client";
import { AliIcon, DetailPageFrame, ImageNameText, StatusTag } from "@/components/common";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { InferenceInvocationTest } from "./InferenceInvocationTest";
import { InferenceLogs } from "./InferenceLogs";
import { InferencePolicies } from "./InferencePolicies";
import { InferenceRelatedResources } from "./InferenceRelatedResources";

type LifecycleAction = "start" | "stop" | "restart";

export function InferenceDetailPage({ serviceId }: { serviceId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lifecycleScope = useIdempotencyScope("inference-service-lifecycle", ["POST", serviceId]);
  const scaleScope = useIdempotencyScope("inference-service-scale", ["PATCH", serviceId]);
  const [scaleVisible, setScaleVisible] = useState(false);
  const [replicas, setReplicas] = useState(1);

  const service = useQuery({
    queryKey: ["inference-service", serviceId],
    queryFn: async () => {
      const { data, error } = await servicesApi.GET("/inference-services/{service_id}", {
        params: { path: { service_id: serviceId } },
      });
      if (error) throw error;
      return data;
    },
  });
  const models = useQuery({
    queryKey: ["inference-service-related-model", serviceId],
    enabled: Boolean(service.data),
    queryFn: async () => {
      const { data, error } = await servicesApi.GET("/models");
      if (error) throw error;
      return data;
    },
  });
  const operationId = service.data?.current_operation_id ?? undefined;
  const operation = useQuery({
    queryKey: ["inference-operation", operationId],
    enabled: Boolean(operationId),
    queryFn: async () => {
      const { data, error } = await servicesApi.GET("/inference-operations/{operation_id}", {
        params: { path: { operation_id: operationId! } },
      });
      if (error) throw error;
      return data;
    },
  });

  useListErrorNotification({
    id: `inference-service-detail:${serviceId}`,
    title: "推理服务详情加载失败",
    error: service.error,
  });

  const lifecycle = useMutation({
    mutationFn: async (action: LifecycleAction) => {
      const submitData = { action };
      const { data, error } = await servicesApi.POST("/inference-services/{service_id}/lifecycle", {
        params: { path: { service_id: serviceId } },
        body: lifecycleScope.withKey(submitData),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      lifecycleScope.reset();
      Message.success("生命周期操作已提交");
      void qc.invalidateQueries({
        queryKey: ["inference-service", serviceId],
      });
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
    },
    onError: (error) => showApiError(error),
  });
  const scale = useMutation({
    mutationFn: async () => {
      const submitData = { replicas };
      const { data, error } = await servicesApi.PATCH("/inference-services/{service_id}", {
        params: { path: { service_id: serviceId } },
        body: scaleScope.withKey(submitData),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      scaleScope.reset();
      Message.success("副本调整已提交");
      setScaleVisible(false);
      void qc.invalidateQueries({
        queryKey: ["inference-service", serviceId],
      });
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
    },
    onError: (error) => showApiError(error),
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { data, error } = await servicesApi.DELETE("/inference-services/{service_id}", {
        params: { path: { service_id: serviceId } },
      });
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

  if (service.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size={32} />
      </div>
    );
  }

  if (!service.data) {
    return (
      <DetailPageFrame
        breadcrumbs={[
          { label: "AI 服务" },
          { label: "推理服务", to: "/inference" },
          { label: serviceId },
        ]}
        title={serviceId}
        icon={<AliIcon name="tuilifuwu" size={28} />}
        headerItems={[
          { label: "服务 ID", value: serviceId },
          { label: "状态", value: "-" },
          { label: "创建时间", value: "-" },
        ]}
        actions={<Button onClick={() => service.refetch()}>重新加载</Button>}
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [{ label: "加载结果", value: "未能获取该推理服务详情" }],
          },
        ]}
        onBack={() => navigate({ to: "/inference" })}
      />
    );
  }

  const item = service.data;
  const resources = item.resources;
  const accelerator = resources?.accelerator;
  const relatedModel = models.data?.items.find(
    (model) =>
      model.name === item.model ||
      model.versions?.some((version) => version.id === item.model_version_id),
  );
  const statusDetail = [item.status_reason, item.status_message].filter(Boolean).join("：");
  const serviceStatus = statusDetail ? (
    <Tooltip content={statusDetail}>
      <span className="inline-flex">
        <StatusTag status={item.status} />
      </span>
    </Tooltip>
  ) : (
    <StatusTag status={item.status} />
  );
  const actions = (
    <Space wrap>
      {item.status === "running" ? (
        <Button loading={lifecycle.isPending} onClick={() => lifecycle.mutate("stop")}>
          停止
        </Button>
      ) : null}
      {item.status === "stopped" ? (
        <Button loading={lifecycle.isPending} onClick={() => lifecycle.mutate("start")}>
          启动
        </Button>
      ) : null}
      {item.status === "running" || item.status === "failed" ? (
        <Button loading={lifecycle.isPending} onClick={() => lifecycle.mutate("restart")}>
          重启
        </Button>
      ) : null}
      {item.status === "running" ? (
        <Button
          onClick={() => {
            setReplicas(item.replicas);
            setScaleVisible(true);
          }}
        >
          调整副本
        </Button>
      ) : null}
      <Button
        status="danger"
        loading={remove.isPending}
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
              { label: "状态", value: serviceStatus },
              {
                label: "模型",
                value: relatedModel ? (
                  <Link to="/models/$modelId" params={{ modelId: relatedModel.id }}>
                    {relatedModel.display_name || relatedModel.name}
                  </Link>
                ) : (
                  item.model
                ),
              },
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
                  {
                    auto: "自动",
                    single_node: "单节点",
                    multi_node: "多节点",
                  }[item.placement_mode] ?? item.placement_mode,
              },
              { label: "期望副本", value: item.replicas },
              { label: "就绪副本", value: item.ready_replicas },
            ],
          },
          ...(operationId
            ? [
                {
                  key: "operation",
                  title: "当前操作",
                  fields: operation.error
                    ? [
                        {
                          label: "加载结果",
                          value: getErrorMessage(operation.error, "操作状态加载失败"),
                        },
                      ]
                    : operation.isLoading
                      ? [{ label: "状态", value: <Spin size={16} /> }]
                      : operation.data
                        ? [
                            {
                              label: "任务类型",
                              value: operation.data.task_type,
                            },
                            {
                              label: "状态",
                              value: <StatusTag status={operation.data.status} />,
                            },
                            {
                              label: "进度",
                              value: `${operation.data.progress_pct}%`,
                            },
                            {
                              label: "创建时间",
                              value: formatDateTime(operation.data.created_at),
                            },
                            {
                              label: "错误",
                              value: operation.data.error_message ?? "-",
                            },
                          ]
                        : [{ label: "状态", value: "暂无操作信息" }],
                },
              ]
            : []),
          {
            key: "runtime",
            title: "运行与访问",
            defaultCollapsed: true,
            fields: [
              { label: "镜像 ID", value: item.image_id ?? "-" },
              {
                label: "镜像引用",
                value: <ImageNameText image={item.image_ref} />,
              },
              { label: "调用地址", value: item.invocation_url ?? "-" },
              { label: "端点地址", value: item.endpoint_url ?? "-" },
              { label: "配置代次", value: item.generation },
              { label: "已观察代次", value: item.observed_generation },
              { label: "更新时间", value: formatDateTime(item.updated_at) },
            ],
          },
        ]}
        tabs={[
          {
            key: "related",
            label: "关联资源",
            content: (
              <InferenceRelatedResources
                service={item}
                model={relatedModel}
                loading={models.isFetching}
                error={models.error}
              />
            ),
          },
          {
            key: "invocation-test",
            label: "调用测试",
            content: (
              <InferenceInvocationTest
                servedModelName={item.served_model_name || item.name}
                status={item.status}
                endpointUrl={item.invocation_url ?? item.endpoint_url}
              />
            ),
          },
          {
            key: "monitoring",
            label: "监控",
            content: (
              <div className="flex min-h-[240px] items-center justify-center">
                <Empty description="暂无监控数据，监控能力尚未开放" />
              </div>
            ),
          },
          {
            key: "logs",
            label: "日志",
            content: <InferenceLogs serviceId={item.id} />,
          },
          {
            key: "events",
            label: "事件",
            content: (
              <div className="flex min-h-[240px] items-center justify-center">
                <Empty description="暂无服务事件，事件查询能力尚未开放" />
              </div>
            ),
          },
          {
            key: "policies",
            label: "策略",
            content: <InferencePolicies serviceId={item.id} />,
          },
        ]}
        onBack={() => navigate({ to: "/inference" })}
      />
      <Modal
        visible={scaleVisible}
        title="调整副本数"
        onCancel={() => {
          setScaleVisible(false);
          scaleScope.reset();
        }}
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
            调整请求将异步执行，可在详情栏的“当前操作”中查看进度。
          </Typography.Text>
        </Space>
      </Modal>
    </>
  );
}
