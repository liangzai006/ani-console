import type { StorageBucketRecord } from "@/api/storage/buckets";
import { DataTable } from "@/components/common";
import { copyToClipboard } from "@/lib/clipboard";
import { Button, Space, Typography } from "@arco-design/web-react";

type AccessDomainRow = {
  key: "region" | "endpoint" | "bucket";
  type: string;
  address: string;
  copyable?: boolean;
};

export function BucketAccess({ bucket }: { bucket: StorageBucketRecord }) {
  const rows: AccessDomainRow[] = [
    { key: "region", type: "区域", address: bucket.region ?? "-" },
    {
      key: "endpoint",
      type: "Endpoint",
      address: bucket.endpoint ?? "-",
      copyable: Boolean(bucket.endpoint),
    },
    { key: "bucket", type: "存储桶名称", address: bucket.name },
  ];

  return (
    <Space direction="vertical" size={20} className="w-full">
      <Typography.Title heading={6}>访问域名</Typography.Title>
      <DataTable<AccessDomainRow>
        tableLabel="访问域名"
        rowKey="key"
        pagination={false}
        data={rows}
        columns={[
          { title: "类型", dataIndex: "type", width: 240 },
          {
            title: "地址",
            render: (_, row) => (
              <Space>
                <Typography.Text>{row.address}</Typography.Text>
                {row.copyable ? (
                  <Button size="mini" onClick={() => void copyToClipboard(row.address, "Endpoint")}>
                    复制
                  </Button>
                ) : null}
              </Space>
            ),
          },
        ]}
      />
    </Space>
  );
}
