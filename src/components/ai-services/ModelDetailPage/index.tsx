import { withId } from "@/lib/id";
import { Button, Dropdown, Menu, Modal, Space } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { deleteModel, getModel } from "@/api/ai-services/models";

import { CreateInferenceServiceModal } from "@/components/ai-services/CreateInferenceServiceModal";
import { navigationBreadcrumbsForPath } from "@/components/layouts/AppLayout/navigation";
import {
  AliIcon,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
  StatusTag,
  type DetailCard,
} from "@/components/common";
import { formatBytes, formatDateTime } from "@/lib/format";
import {
  formatModelCapabilities,
  getLatestModelVersion,
  MODEL_SOURCE_LABELS,
} from "@/lib/ai-models";
import { ModelRelatedResources } from "./ModelRelatedResources";
import { ModelOperationHistory } from "./ModelOperationHistory";
import { ModelRecommendedConfiguration } from "./ModelRecommendedConfiguration";

export function ModelDetailPage({ modelId }: { modelId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deployVisible, setDeployVisible] = useState(false);
  const model = useQuery({
    meta: {
      errorNotification: {
        id: withId("model", modelId),
        action: "模型详情加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["model", modelId],
    queryFn: () => getModel(modelId),
  });
  const remove = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "model-delete",
        action: "删除模型",
        successText: "模型已删除",
        errorFallback: "删除模型失败",
      },
    },
    mutationFn: () => deleteModel(modelId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["models"] });
      navigate({ to: "/models" });
    },
  });

  if (!model.data) {
    return <DetailPagePlaceholder loading={model.isLoading} />;
  }

  const item = model.data;
  const latestVersion = getLatestModelVersion(item);
  const detailCards: DetailCard[] = [
    {
      key: "basic",
      title: "基本信息",
      fields: [
        { label: "ID", value: <ResourceId value={item.id} /> },
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
      title: "版本信息",
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
  ];

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          ...navigationBreadcrumbsForPath("/models"),
          { label: item.display_name || item.name },
        ]}
        title={item.display_name || item.name}
        status={<StatusTag status={item.status} />}
        icon={<AliIcon name="moxing" size={28} />}
        headerItems={[
          { label: "最新版本", value: latestVersion?.version ?? "-" },
          { label: "更新时间", value: formatDateTime(item.updated_at) },
        ]}
        actions={
          <Space wrap>
            <Button
              type="primary"
              disabled={item.status !== "ready" || !latestVersion}
              onClick={() => setDeployVisible(true)}
            >
              部署
            </Button>
            <Dropdown
              trigger="click"
              position="br"
              droplist={
                <Menu>
                  <Menu.Item
                    key="delete"
                    disabled={remove.isPending}
                    style={{ color: "var(--color-danger-6)" }}
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
                  </Menu.Item>
                </Menu>
              }
            >
              <Button disabled={remove.isPending} aria-label="更多操作" title="更多操作">
                <IconMoreVertical />
              </Button>
            </Dropdown>
          </Space>
        }
        cards={detailCards}
        tabs={[
          {
            key: "related",
            label: "关联资源",
            content: <ModelRelatedResources model={item} />,
          },
          {
            key: "recommended-configuration",
            label: "推荐配置",
            content: <ModelRecommendedConfiguration />,
          },
          {
            key: "operation-history",
            label: "操作记录",
            content: <ModelOperationHistory />,
          },
        ]}
        onBack={() => navigate({ to: "/models" })}
      />
      {deployVisible && (
        <CreateInferenceServiceModal
          initialServiceName={("infer-" + item.name).slice(0, 63)}
          initialModelId={item.id}
          initialModelVersionId={latestVersion?.id}
          onCancel={() => setDeployVisible(false)}
        />
      )}
    </>
  );
}
