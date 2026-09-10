import { getInstanceOperation, type InstanceOperation } from "@/api/instances";
import { Alert, Spin } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StatusTag } from "@/components/common";

type OperationStatus = InstanceOperation["status"];

const TERMINAL_STATUSES: OperationStatus[] = ["succeeded", "failed", "cancelled"];

export function InstanceOperationPoller({
  operationId,
  onComplete,
}: {
  operationId: string;
  onComplete?: (status: OperationStatus) => void;
}) {
  const [done, setDone] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["instance-operation", operationId],
    queryFn: () => getInstanceOperation(operationId),
    enabled: Boolean(operationId) && !done,
    refetchInterval: 2_000,
  });

  useEffect(() => {
    const status = data?.status;
    if (done || !status || !TERMINAL_STATUSES.includes(status)) return;
    setDone(true);
    onComplete?.(status);
  }, [data?.status, done, onComplete]);

  if (isLoading && !data) return <Spin />;
  if (error) return <Alert type="error" content="实例操作状态查询失败" />;

  const failureMessage = data?.failure_message ?? data?.failure_reason;
  return (
    <Alert
      type={data?.status === "failed" ? "error" : data?.status === "succeeded" ? "success" : "info"}
      content={
        <>
          操作 {operationId.slice(0, 8)}… 状态：
          <StatusTag status={data?.status} />
          {failureMessage ? ` · ${failureMessage}` : null}
        </>
      }
    />
  );
}
