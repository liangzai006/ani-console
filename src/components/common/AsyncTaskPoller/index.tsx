import { withId } from "@/lib/id";
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
    meta: {
      errorNotification: {
        id: withId("task", taskId),
        action: "任务状态加载",
        fallback: "请求失败，请稍后重试",
      },
    },
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
  if (error) return null;
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
