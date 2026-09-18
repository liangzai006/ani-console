import type { InstanceRecord } from "@/api/instances";
import { DataTable } from "@/components/common";
import { getInstanceDisplayIp, getInstanceNetworkValue } from "@/lib/instances";

type NetworkRow = {
  type: string;
  name: string;
};

export function InstanceNetwork({ instance }: { instance: InstanceRecord }) {
  const rows: NetworkRow[] = [
    { type: "VPC", name: getInstanceNetworkValue(instance, "vpc_id") },
    { type: "子网", name: getInstanceNetworkValue(instance, "subnet_id") },
    { type: "私网 IP", name: getInstanceDisplayIp(instance) || "-" },
    { type: "访问地址", name: instance.endpoint ?? "-" },
  ];

  return (
    <DataTable<NetworkRow>
      data={rows}
      rowKey="type"
      pagination={false}
      tableLabel="实例网络信息"
      columns={[
        { title: "类型", dataIndex: "type", width: 160 },
        { title: "名称", dataIndex: "name", ellipsis: true },
      ]}
    />
  );
}
