import { Link } from "@arco-design/web-react";
import { useNavigate } from "@tanstack/react-router";
import type { InferenceService } from "@/api/ai-services/inference";
import { DataTable, type ListColumn } from "@/components/common";
import { navigateToResourceDetail } from "@/lib/resources";

interface RelatedResource {
  id: string;
  type: string;
  name: string;
  reference: string;
}

export function InferenceRelatedResources({ service }: { service: InferenceService }) {
  const navigate = useNavigate();
  const resources: RelatedResource[] = [
    {
      id: "model",
      type: "模型",
      name: service.served_model_name || service.model,
      reference: service.model,
    },
  ];
  const columns: Array<ListColumn<RelatedResource>> = [
    { title: "类型", dataIndex: "type", width: 120 },
    {
      title: "名称",
      render: (_, resource) => (
        <Link
          onClick={() =>
            navigateToResourceDetail(navigate, { type: "model", id: resource.reference })
          }
        >
          {resource.name || resource.reference}
        </Link>
      ),
    },
    {
      title: "资源标识",
      dataIndex: "reference",
      ellipsis: true,
    },
  ];

  return (
    <section>
      <DataTable<RelatedResource>
        header={{ title: "AI 关联" }}
        data={resources}
        pagination={false}
        rowKey="id"
        columns={columns}
        tableLabel="推理服务 AI 关联资源列表"
      />
    </section>
  );
}
