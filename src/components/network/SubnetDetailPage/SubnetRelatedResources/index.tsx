import { listInstances, type InstanceRecord } from "@/api/instances";
import { DataTable, StatusTag, TableSectionHeader, type ListColumn } from "@/components/common";
import { withId } from "@/lib/id";
import { Empty, Tag, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";

type RelatedResource = { id: string; kind: "实例"; name: string; status: string };

export function SubnetRelatedResources({ subnetId }: { subnetId: string }) {
  const instances = useQuery({
    meta: {
      errorNotification: {
        id: withId("subnet-instances", subnetId),
        action: "关联实例加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["instances", "subnet", subnetId],
    queryFn: () => listInstances({ limit: 100, subnet_id: subnetId }),
  });
  const resources: RelatedResource[] = ((instances.data?.items ?? []) as InstanceRecord[]).map(
    (item) => ({ id: item.id, kind: "实例", name: item.name, status: item.state }),
  );
  const columns: Array<ListColumn<RelatedResource>> = [
    { title: "类型", width: 120, render: (_, item) => <Tag>{item.kind}</Tag> },
    { title: "名称", dataIndex: "name" },
    { title: "资源 ID", dataIndex: "id" },
    { title: "状态", width: 120, render: (_, item) => <StatusTag status={item.status} /> },
  ];

  return (
    <section>
      <TableSectionHeader
        title="关联资源"
        extra={<Typography.Text type="secondary">{resources.length} 项</Typography.Text>}
      />
      <DataTable<RelatedResource>
        columns={columns}
        data={resources}
        loading={instances.isLoading}
        noDataElement={<Empty description="暂无关联资源" />}
        pagination={false}
        tableLabel="子网关联资源"
      />
    </section>
  );
}
