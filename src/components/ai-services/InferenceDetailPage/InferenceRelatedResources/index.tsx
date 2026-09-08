import { Alert, Empty, Space } from "@arco-design/web-react";
import { Link } from "@tanstack/react-router";
import type { components } from "@/api/services-schema";
import {
  DataTable,
  TableSectionHeader,
  type ListColumn,
} from "@/components/common";
import { getErrorMessage } from "@/lib/errors";
import { getImageDisplayName } from "@/lib/render";

type InferenceService = components["schemas"]["InferenceService"];
type Model = components["schemas"]["Model"];

interface RelatedResource {
  id: string;
  type: string;
  name: string;
  reference: string;
}

export function InferenceRelatedResources({
  service,
  model,
  loading,
  error,
}: {
  service: InferenceService;
  model?: Model;
  loading: boolean;
  error: unknown;
}) {
  const version = model?.versions?.find(
    (item) => item.id === service.model_version_id,
  );
  const resources: RelatedResource[] = [
    {
      id: "model",
      type: "模型",
      name: model?.display_name || model?.name || service.model,
      reference: model?.id ?? "-",
    },
    {
      id: "version",
      type: "模型版本",
      name: version?.version ?? service.model,
      reference: service.model_version_id ?? "-",
    },
    {
      id: "image",
      type: "运行镜像",
      name: getImageDisplayName(service.image_ref ?? service.image_id),
      reference: service.image_id ?? service.image_ref ?? "-",
    },
  ];
  const columns: Array<ListColumn<RelatedResource>> = [
    { title: "类型", dataIndex: "type", width: 120 },
    {
      title: "名称",
      render: (_, resource) =>
        resource.id === "model" && model ? (
          <Link to="/models/$modelId" params={{ modelId: model.id }}>
            {resource.name}
          </Link>
        ) : (
          resource.name
        ),
    },
    {
      title: "资源标识",
      dataIndex: "reference",
      ellipsis: true,
    },
  ];

  return (
    <Space direction="vertical" size={24} className="w-full">
      <section>
        <TableSectionHeader title="AI 关联" />
        {error ? (
          <Alert
            type="error"
            showIcon
            content={getErrorMessage(error, "关联模型加载失败")}
          />
        ) : (
          <DataTable<RelatedResource>
            data={resources}
            loading={loading}
            pagination={false}
            rowKey="id"
            noDataElement={<Empty description="暂无 AI 关联" />}
            columns={columns}
            tableLabel="推理服务 AI 关联资源列表"
          />
        )}
      </section>
      <section>
        <TableSectionHeader title="安全关联" />
        <div className="flex min-h-[160px] items-center justify-center">
          <Empty description="暂无安全关联" />
        </div>
      </section>
    </Space>
  );
}
