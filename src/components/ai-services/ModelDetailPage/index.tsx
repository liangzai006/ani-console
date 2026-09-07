import {
  Button,
  Empty,
  Message,
  Modal,
  Space,
  Spin,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { showApiError } from "@/api/helpers";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { CreateInferenceServiceModal } from "@/components/ai-services/CreateInferenceServiceModal";
import {
  AliIcon,
  DataTable,
  DetailPageFrame,
  StatusTag,
} from "@/components/common";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatBytes, formatDateTime } from "@/lib/format";
import {
  formatModelCapabilities,
  getLatestModelVersion,
  MODEL_SOURCE_LABELS,
  type ModelVersion,
} from "@/lib/model-catalog";

type InferenceService = components["schemas"]["InferenceService"];

export function ModelDetailPage({ modelId }: { modelId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deployVisible, setDeployVisible] = useState(false);
  const model = useQuery({
    queryKey: ["model", modelId],
    queryFn: async () => {
      const { data, error } = await servicesApi.GET("/models/{model_id}", {
        params: { path: { model_id: modelId } },
      });
      if (error) throw error;
      return data;
    },
  });
  const relatedServices = useQuery({
    queryKey: ["model-related-inference-services", modelId],
    enabled: Boolean(model.data),
    queryFn: async () => {
      const { data, error } = await servicesApi.GET("/inference-services");
      if (error) throw error;
      return data;
    },
  });
  useListErrorNotification({
    id: "model-detail:" + modelId,
    title: "模型详情加载失败",
    error: model.error,
  });
  useListErrorNotification({
    id: "model-related-inference-services:" + modelId,
    title: "关联推理服务加载失败",
    error: relatedServices.error,
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await servicesApi.DELETE("/models/{model_id}", {
        params: { path: { model_id: modelId } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      Message.success("模型已删除");
      void qc.invalidateQueries({ queryKey: ["models"] });
      navigate({ to: "/models" });
    },
    onError: (error) => showApiError(error, "删除模型失败"),
  });

  if (model.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size={32} />
      </div>
    );
  }

  if (!model.data) {
    return (
      <DetailPageFrame
        breadcrumbs={[
          { label: "AI 服务" },
          { label: "模型仓库", to: "/models" },
          { label: modelId },
        ]}
        title={modelId}
        icon={<AliIcon name="moxing" size={28} />}
        headerItems={[
          { label: "模型 ID", value: modelId },
          { label: "状态", value: "-" },
          { label: "更新时间", value: "-" },
        ]}
        actions={<Button onClick={() => model.refetch()}>重新加载</Button>}
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [{ label: "加载结果", value: "未能获取该模型详情" }],
          },
        ]}
        onBack={() => navigate({ to: "/models" })}
      />
    );
  }

  const item = model.data;
  const latestVersion = getLatestModelVersion(item);
  const versionIds = new Set(
    (item.versions ?? []).map((version) => version.id),
  );
  const inferenceItems = (relatedServices.data?.items ?? []).filter(
    (service) =>
      service.model === item.name ||
      Boolean(
        service.model_version_id && versionIds.has(service.model_version_id),
      ),
  );

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "AI 服务" },
          { label: "模型仓库", to: "/models" },
          { label: item.display_name || item.name },
        ]}
        title={item.display_name || item.name}
        status={<StatusTag status={item.status} />}
        icon={<AliIcon name="moxing" size={28} />}
        headerItems={[
          { label: "模型 ID", value: item.id },
          { label: "最新版本", value: latestVersion?.version ?? "-" },
          { label: "更新时间", value: formatDateTime(item.updated_at) },
        ]}
        actions={
          <Space>
            <Button
              type="primary"
              disabled={item.status !== "ready" || !latestVersion}
              onClick={() => setDeployVisible(true)}
            >
              部署
            </Button>
            <Button
              status="danger"
              loading={remove.isPending}
              onClick={() =>
                Modal.confirm({
                  title: "删除模型",
                  content:
                    "确定删除「" +
                    (item.display_name || item.name) +
                    "」？有关联推理服务时后端可能拒绝删除。",
                  okButtonProps: { status: "danger" },
                  onOk: () => remove.mutateAsync(),
                })
              }
            >
              删除
            </Button>
          </Space>
        }
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [
              { label: "ID", value: item.id },
              { label: "名称", value: item.name },
              {
                label: "状态",
                value: <StatusTag status={item.status} />,
              },
              { label: "来源", value: MODEL_SOURCE_LABELS[item.source] },
              {
                label: "任务",
                value: formatModelCapabilities(item.capabilities),
              },
              { label: "描述", value: item.description || "-" },
            ],
          },
          {
            key: "catalog",
            title: "Catalog 信息",
            fields: [
              { label: "最新版本", value: latestVersion?.version ?? "-" },
              {
                label: "版本数",
                value: String(item.versions?.length ?? 0) + " 个",
              },
              { label: "模型大小", value: formatBytes(item.total_size_bytes) },
              { label: "创建时间", value: formatDateTime(item.created_at) },
              { label: "更新时间", value: formatDateTime(item.updated_at) },
            ],
          },
        ]}
        tabs={[
          {
            key: "versions",
            label: "模型版本",
            content: (
              <DataTable<ModelVersion>
                columns={[
                  { title: "版本", dataIndex: "version" },
                  { title: "格式", dataIndex: "format" },
                  {
                    title: "加密",
                    render: (_, version) =>
                      version.is_encrypted ? "是" : "否",
                  },
                  {
                    title: "大小",
                    render: (_, version) => formatBytes(version.size_bytes),
                  },
                  {
                    title: "校验值",
                    dataIndex: "checksum_sha256",
                    placeholder: "-",
                  },
                  {
                    title: "创建时间",
                    render: (_, version) => formatDateTime(version.created_at),
                  },
                ]}
                data={item.versions ?? []}
                pagination={false}
                noDataElement={<Empty description="暂无模型版本" />}
                tableLabel="模型版本列表"
              />
            ),
          },
          {
            key: "related",
            label: "关联资源",
            content: (
              <DataTable<InferenceService>
                columns={[
                  {
                    title: "推理服务",
                    render: (_, service) => (
                      <Link
                        to="/inference/$serviceId"
                        params={{ serviceId: service.id }}
                      >
                        {service.name}
                      </Link>
                    ),
                  },
                  {
                    title: "状态",
                    width: 120,
                    render: (_, service) => (
                      <StatusTag status={service.status} />
                    ),
                  },
                  { title: "模型", dataIndex: "model" },
                  {
                    title: "副本",
                    render: (_, service) =>
                      String(service.ready_replicas) +
                      " / " +
                      String(service.replicas),
                  },
                  {
                    title: "创建时间",
                    render: (_, service) => formatDateTime(service.created_at),
                  },
                ]}
                data={inferenceItems}
                loading={relatedServices.isFetching}
                pagination={false}
                noDataElement={<Empty description="暂无关联推理服务" />}
                tableLabel="关联推理服务列表"
              />
            ),
          },
        ]}
        onBack={() => navigate({ to: "/models" })}
      />
      <CreateInferenceServiceModal
        visible={deployVisible}
        initialServiceName={("infer-" + item.name).slice(0, 63)}
        initialModelId={item.id}
        initialModelVersionId={latestVersion?.id}
        onCancel={() => setDeployVisible(false)}
      />
    </>
  );
}
