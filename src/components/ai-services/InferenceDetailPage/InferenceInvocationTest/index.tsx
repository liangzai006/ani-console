import { Descriptions } from "@arco-design/web-react";

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
    </div>
  );
}
