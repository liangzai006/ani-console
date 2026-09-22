import { withId } from "@/lib/id";
import { Button, Empty, Select, Space } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listInferenceServiceLogs, type InferenceServiceLog } from "@/api/ai-services/inference";
import { DataTable } from "@/components/common";
import { formatDateTime } from "@/lib/format";

type LogLevel = "all" | "debug" | "info" | "warn" | "error";

export function InferenceLogs({ serviceId }: { serviceId: string }) {
  const [level, setLevel] = useState<LogLevel>("all");
  const logs = useQuery({
    meta: {
      errorNotification: {
        id: withId("inference-logs", serviceId, level),
        action: "推理日志加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["inference-service-logs", serviceId, level],
    queryFn: () =>
      listInferenceServiceLogs(serviceId, {
        limit: 200,
        ...(level === "all" ? {} : { level }),
      }),
  });

  return (
    <div>
      <DataTable<InferenceServiceLog>
        header={{
          title: "推理日志",
          extra: (
            <Space wrap>
              <Select
                size="small"
                value={level}
                onChange={setLevel}
                className="w-30"
                options={[
                  { value: "all", label: "全部级别" },
                  { value: "debug", label: "Debug" },
                  { value: "info", label: "Info" },
                  { value: "warn", label: "Warn" },
                  { value: "error", label: "Error" },
                ]}
              />
              <Button size="small" loading={logs.isFetching} onClick={() => void logs.refetch()}>
                刷新
              </Button>
            </Space>
          ),
        }}
        loading={logs.isFetching}
        data={logs.data?.items ?? []}
        rowKey={(row) => `${row.timestamp}-${row.container}-${row.stream}-${row.message}`}
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
    </div>
  );
}
