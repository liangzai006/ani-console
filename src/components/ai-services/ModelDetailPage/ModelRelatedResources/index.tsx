import { Empty } from "@arco-design/web-react";
import { Link } from "@tanstack/react-router";
import type { InferenceService } from "@/api/ai-services/inference";
import { DataTable, StatusTag, TableSectionHeader } from "@/components/common";
import { formatDateTime } from "@/lib/format";

export function ModelRelatedResources({
  services,
  loading,
}: {
  services: InferenceService[];
  loading: boolean;
}) {
  return (
    <div>
      <TableSectionHeader title="关联推理服务" />
      <DataTable<InferenceService>
        columns={[
          {
            title: "推理服务",
            render: (_, service) => (
              <Link
                to="/inference/$serviceId"
                params={{ serviceId: service.id }}
                className="text-[rgb(var(--primary-6))] no-underline"
              >
                {service.name}
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
