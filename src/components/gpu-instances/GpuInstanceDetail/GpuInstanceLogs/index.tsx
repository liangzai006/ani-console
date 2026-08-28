import { Empty, Input } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { coreApi } from "@/api/client";
import { ApiErrorAlert } from "@/components/common";

export function GpuInstanceLogs({ instanceId }: { instanceId: string }) {
  const logs = useQuery({
    queryKey: ["gpu-instance-logs", instanceId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET(
        "/instances/{instance_id}/logs",
        {
          params: {
            path: { instance_id: instanceId },
            query: { limit: 200, follow: false },
          },
          parseAs: "text",
        },
      );
      if (error) throw error;
      return data ?? "";
    },
    refetchInterval: 10000,
  });

  if (logs.error) return <ApiErrorAlert error={logs.error} />;
  if (!logs.data) return <Empty description="暂无日志" />;

  return (
    <Input.TextArea
      aria-label="实例日志"
      value={logs.data}
      readOnly
      autoSize={{ minRows: 18, maxRows: 30 }}
      className="font-mono text-xs leading-6"
    />
  );
}
