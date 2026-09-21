import { Empty, Link } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { listInferenceServices, type InferenceService } from "@/api/ai-services/inference";
import type { Model } from "@/api/ai-services/models";
import { DataTable, StatusTag, TableSectionHeader } from "@/components/common";
import { formatDateTime } from "@/lib/format";
import { withId } from "@/lib/id";
import { navigateToResourceDetail } from "@/lib/resources";

export function ModelRelatedResources({ model }: { model: Model }) {
  const navigate = useNavigate();
  const relatedServices = useQuery({
    meta: {
      errorNotification: {
        id: withId("model-services", model.id),
        action: "关联推理服务加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["model-related-inference-services", model.id],
    queryFn: () => listInferenceServices(),
  });
  const versionIds = new Set((model.versions ?? []).map((version) => version.id));
  const services = (relatedServices.data?.items ?? []).filter(
    (service) =>
      service.model === model.name ||
      Boolean(service.model_version_id && versionIds.has(service.model_version_id)),
  );

  return (
    <div>
      <TableSectionHeader title="关联推理服务" />
      <DataTable<InferenceService>
        columns={[
          {
            title: "推理服务",
            fixed: "left",
            render: (_, service) => (
              <Link
                onClick={() =>
                  navigateToResourceDetail(navigate, {
                    type: "inference-service",
                    id: service.id,
                  })
                }
                className="text-app-primary no-underline"
              >
                {service.name || service.id}
              </Link>
            ),
          },
          {
            title: "状态",
            width: 120,
            render: (_, service) => <StatusTag status={service.status} />,
          },
          { title: "模型", dataIndex: "model", ellipsis: true },
          {
            title: "副本",
            width: 120,
            render: (_, service) => `${service.ready_replicas} / ${service.replicas}`,
          },
          {
            title: "创建时间",
            width: 180,
            render: (_, service) => formatDateTime(service.created_at),
          },
        ]}
        data={services}
        loading={relatedServices.isFetching}
        pagination={false}
        noDataElement={<Empty description="暂无关联推理服务" />}
        tableLabel="关联推理服务列表"
      />
    </div>
  );
}
