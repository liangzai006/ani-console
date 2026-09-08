import { Alert, Descriptions, Empty } from "@arco-design/web-react";

export function InferenceInvocationTest({
  servedModelName,
  status,
  endpointUrl,
}: {
  servedModelName: string;
  status: string;
  endpointUrl?: string | null;
}) {
  return (
    <div>
      <Descriptions
        column={1}
        data={[
          { label: "服务状态", value: status },
          { label: "服务模型名", value: servedModelName },
          { label: "调用地址", value: endpointUrl ?? "-" },
        ]}
      />
      <Alert
        className="mt-4"
        type="warning"
        showIcon
        content="调用测试接口尚未开放，当前无法从 Console 发送测试请求"
      />
      <div className="flex min-h-[240px] items-center justify-center">
        <Empty description="调用测试能力开放后，可在此编辑请求并查看响应与耗时" />
      </div>
    </div>
  );
}
