import {
  applyInferenceServiceLifecycle,
  deleteInferenceService,
  getInferenceService,
  listInferenceServicePolicies,
  updateInferenceService,
} from "@/api/ai-services/inference";
import {
  Link as ArcoLink,
  Button,
  Empty,
  InputNumber,
  Modal,
  Space,
  Tooltip,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  AliIcon,
  DetailPageFrame,
  DetailPagePlaceholder,
  ImageNameText,
  ResourceId,
  StatusTag,
} from "@/components/common";
import { copyToClipboard } from "@/lib/clipboard";
import { formatDateTime } from "@/lib/format";
import { withId } from "@/lib/id";
import { InferenceInvocationTest } from "./InferenceInvocationTest";
import { InferenceLogs } from "./InferenceLogs";
import { InferencePolicies } from "./InferencePolicies";
import { InferenceRelatedResources } from "./InferenceRelatedResources";

type LifecycleAction = "start" | "stop" | "restart";

export function InferenceDetailPage({ serviceId }: { serviceId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [scaleVisible, setScaleVisible] = useState(false);
  const [replicas, setReplicas] = useState(1);
  const [activeTabKey, setActiveTabKey] = useState("related");

  const service = useQuery({
    meta: {
      errorNotification: {
        id: withId("inference-service", serviceId),
        action: "推理服务详情加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["inference-service", serviceId],
    queryFn: () => getInferenceService(serviceId),
  });
  const policies = useQuery({
    meta: {
      errorNotification: {
        id: withId("inference-policies", serviceId),
        action: "访问策略加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["inference-service-policies", serviceId],
    enabled: Boolean(service.data),
    queryFn: () => listInferenceServicePolicies(serviceId),
  });

  const lifecycle = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "inference-lifecycle",
        action: "操作",
        successText: "生命周期操作已提交",
        errorFallback: "请求失败",
      },
    },
    mutationFn: async (action: LifecycleAction) => {
      const submitData = { action };
      return applyInferenceServiceLifecycle(serviceId, submitData);
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["inference-service", serviceId],
      });
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
    },
  });
  const scale = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "inference-scale",
        action: "操作",
        successText: "副本调整已提交",
        errorFallback: "请求失败",
      },
    },
    mutationFn: async () => {
      const submitData = { replicas };
      return updateInferenceService(serviceId, submitData);
    },
    onSuccess: () => {
      setScaleVisible(false);
      void qc.invalidateQueries({
        queryKey: ["inference-service", serviceId],
      });
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
    },
  });
  const remove = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "inference-delete",
        action: "删除",
        successText: "删除操作已提交",
        errorFallback: "请求失败",
      },
    },
    mutationFn: () => deleteInferenceService(serviceId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
      navigate({ to: "/inference" });
    },
  });

  if (!service.data) {
    return <DetailPagePlaceholder loading={service.isLoading} />;
  }

  const item = service.data;
  const invocationUrl = item.invocation_url ?? item.endpoint_url;
  const compatibilityPath = (() => {
    if (!invocationUrl) return "-";
    try {
      return new URL(invocationUrl).pathname;
    } catch {
      return invocationUrl.startsWith("/") ? invocationUrl : "-";
    }
  })();
  const engineCommand = item.engine?.command ?? [];
  const engineCommandText = engineCommand.join(" ");
  const engineSource = `${engineCommandText} ${item.image_ref ?? ""}`;
  const engineName = /\bvllm\b/i.test(engineSource)
    ? "vLLM"
    : /\btei\b|text-embeddings-inference/i.test(engineSource)
      ? "TEI"
      : engineCommand[0] || "-";
  const engineEnvironment = new Map(
    (item.engine?.env ?? []).map((entry) => [entry.name.toUpperCase(), entry.value]),
  );
  const precisionArgument = engineCommand.find(
    (_argument, index) =>
      index > 0 && ["--dtype", "--torch-dtype", "--precision"].includes(engineCommand[index - 1]),
  );
  const precision =
    precisionArgument ??
    engineEnvironment.get("VLLM_DTYPE") ??
    engineEnvironment.get("TORCH_DTYPE") ??
    engineEnvironment.get("PRECISION");
  const normalizedPrecision = precision
    ?.replace(/^float16$/i, "fp16")
    .replace(/^float32$/i, "fp32")
    .replace(/^bfloat16$/i, "bf16");
  const engineLabel = [engineName, normalizedPrecision].filter(Boolean).join(" · ");
  const requestPolicy =
    policies.data?.policies.find(
      (policy) => policy.status === "enabled" && policy.rate_limits.qps != null,
    ) ??
    policies.data?.policies.find((policy) => policy.status === "enabled") ??
    policies.data?.policies[0];
  const qpsLabel = policies.isLoading
    ? "QPS 加载中…"
    : `QPS ${requestPolicy?.rate_limits.qps ?? "-"}`;
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
              { label: "ID", value: <ResourceId value={item.id} /> },
              { label: "状态", value: serviceStatus },
              { label: "规格", value: "-" },
              {
                label: "模型",
                value: item.served_model_name || item.model,
              },
              {
                label: "推理引擎",
                value: engineLabel,
              },
              {
                label: "OpenAI 兼容",
                value: (
                  <Space size={4} wrap>
                    <Typography.Text code>{compatibilityPath}</Typography.Text>
                    <Typography.Text type="secondary">·</Typography.Text>
                    <Typography.Text>
                      model=<strong>{item.served_model_name || item.name}</strong>
                    </Typography.Text>
                  </Space>
                ),
              },
              {
                label: "调用地址",
                value: invocationUrl ? (
                  <Space size={4} wrap>
                    <ArcoLink href={invocationUrl} target="_blank" rel="noreferrer">
                      {invocationUrl}
                    </ArcoLink>
                    <Button
                      type="text"
                      size="mini"
                      onClick={() => void copyToClipboard(invocationUrl, "调用地址")}
                    >
                      复制
                    </Button>
                  </Space>
                ) : (
                  "-"
                ),
              },
              {
                label: "请求限流",
                value: (
                  <Space size={4} wrap>
                    <Typography.Text>{qpsLabel}</Typography.Text>
                    <Typography.Text type="secondary">·</Typography.Text>
                    <Typography.Text>并发 {item.max_concurrency ?? "-"}</Typography.Text>
                    <Typography.Text type="secondary">·</Typography.Text>
                    <Button type="text" size="mini" onClick={() => setActiveTabKey("policies")}>
                      配置
                    </Button>
                  </Space>
                ),
              },
              { label: "创建时间", value: formatDateTime(item.created_at) },
            ],
          },
          {
            key: "related-summary",
            title: "关联摘要",
            fields: [
              {
                label: "模型",
                value: item.served_model_name || item.model,
              },
              {
                label: "模型版本",
                value: item.model_version_id ?? "-",
              },
              {
                label: "运行镜像",
                value: <ImageNameText image={item.image_ref ?? item.image_id} />,
              },
            ],
          },
        ]}
        tabs={[
          {
            key: "related",
            label: "关联资源",
            content: <InferenceRelatedResources service={item} />,
          },
          {
            key: "policies",
            label: "策略",
            content: <InferencePolicies serviceId={item.id} />,
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
              <div className="flex min-h-60 items-center justify-center">
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
              <div className="flex min-h-60 items-center justify-center">
                <Empty description="暂无服务事件，事件查询能力尚未开放" />
              </div>
            ),
          },
        ]}
        activeTabKey={activeTabKey}
        onTabChange={setActiveTabKey}
        onBack={() => navigate({ to: "/inference" })}
      />
      <Modal
        visible={scaleVisible}
        title="调整副本数"
        onCancel={() => {
          setScaleVisible(false);
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
