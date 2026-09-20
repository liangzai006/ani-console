import { Empty, Link } from "@arco-design/web-react";
import { useNavigate } from "@tanstack/react-router";
import type { InferenceService } from "@/api/ai-services/inference";
import { DataTable, StatusTag, TableSectionHeader } from "@/components/common";
import { formatDateTime } from "@/lib/format";
import { navigateToResourceDetail } from "@/lib/resources";

export function ModelRelatedResources({
  services,
  loading,
}: {
  services: InferenceService[];
  loading: boolean;
}) {
  const navigate = useNavigate();
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
        loading={loading}
        pagination={false}
        noDataElement={<Empty description="暂无关联推理服务" />}
        tableLabel="关联推理服务列表"
      />
    </div>
  );
}
