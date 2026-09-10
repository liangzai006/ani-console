import { useEffect, useState } from "react";
import { Alert, Spin } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { getTask } from "@/api/tasks";
import { StatusTag } from "../StatusTag";

interface AsyncTaskPollerProps {
  taskId: string;
  onComplete?: (status: string) => void;
}

export function AsyncTaskPoller({ taskId, onComplete }: AsyncTaskPollerProps) {
  const [done, setDone] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId),
    enabled: !!taskId && !done,
  });

  useEffect(() => {
    const status = data?.status;
    if (status && ["completed", "failed", "cancelled", "dead_letter"].includes(status)) {
      setDone(true);
      onComplete?.(status);
    }
  }, [data?.status, onComplete]);

  if (isLoading && !data) return <Spin />;
  if (error) return <Alert type="error" content="任务状态查询失败" />;
  return (
    <Alert
      type={data?.status === "failed" ? "error" : data?.status === "completed" ? "success" : "info"}
      content={
        <>
          任务 {taskId.slice(0, 8)}… 状态：
          <StatusTag status={data?.status} />
        </>
      }
    />
  );
}
