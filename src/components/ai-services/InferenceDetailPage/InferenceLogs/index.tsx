import { Alert, Button, Empty, Select, Space } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { DataTable, TableSectionHeader } from "@/components/common";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";

type InferenceLog = components["schemas"]["InferenceServiceLog"];
type LogLevel = "all" | "debug" | "info" | "warn" | "error";

export function InferenceLogs({ serviceId }: { serviceId: string }) {
  const [level, setLevel] = useState<LogLevel>("all");
  const logs = useQuery({
    queryKey: ["inference-service-logs", serviceId, level],
    queryFn: async () => {
      const { data, error } = await servicesApi.GET(
        "/inference-services/{service_id}/logs",
        {
          params: {
            path: { service_id: serviceId },
            query: {
              limit: 200,
              ...(level === "all" ? {} : { level }),
            },
          },
        },
      );
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <TableSectionHeader
        title="推理日志"
        extra={
          <Space wrap>
            <Select
              size="small"
              value={level}
              onChange={setLevel}
              className="w-[120px]"
              options={[
                { value: "all", label: "全部级别" },
                { value: "debug", label: "Debug" },
                { value: "info", label: "Info" },
                { value: "warn", label: "Warn" },
                { value: "error", label: "Error" },
              ]}
            />
            <Button
              size="small"
              loading={logs.isFetching}
              onClick={() => void logs.refetch()}
            >
              刷新
            </Button>
          </Space>
        }
      />
      {logs.error ? (
        <Alert
          type="error"
          showIcon
          content={getErrorMessage(logs.error, "日志加载失败")}
        />
      ) : (
        <DataTable<InferenceLog>
          loading={logs.isFetching}
          data={logs.data?.items ?? []}
          rowKey={(row) =>
            `${row.timestamp}-${row.container}-${row.stream}-${row.message}`
          }
          pagination={false}
          noDataElement={<Empty description="暂无日志" />}
          columns={[
            {
              title: "时间",
              width: 180,
              render: (_, row) => formatDateTime(row.timestamp),
            },
            { title: "级别", dataIndex: "level", width: 100 },
            {
              title: "容器",
              dataIndex: "container",
              placeholder: "-",
              width: 160,
              ellipsis: true,
            },
            {
              title: "输出流",
              dataIndex: "stream",
              placeholder: "-",
              width: 100,
            },
            { title: "消息", dataIndex: "message", ellipsis: true },
          ]}
          tableLabel="推理日志列表"
        />
      )}
    </div>
  );
}
