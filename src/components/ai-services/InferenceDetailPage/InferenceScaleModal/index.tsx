import { updateInferenceService } from "@/api/ai-services/inference";
import { InputNumber, Modal, Space, Typography } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function InferenceScaleModal({
  serviceId,
  initialReplicas,
  onCancel,
}: {
  serviceId: string;
  initialReplicas: number;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [replicas, setReplicas] = useState(initialReplicas);
  const scale = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "inference-scale",
        action: "操作",
        successText: "副本调整已提交",
        errorFallback: "请求失败",
      },
    },
    mutationFn: () => updateInferenceService(serviceId, { replicas }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inference-service", serviceId] });
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
      onCancel();
    },
  });

  return (
    <Modal
      visible
      title="调整副本数"
      onCancel={onCancel}
      onOk={() => scale.mutateAsync()}
      confirmLoading={scale.isPending}
    >
      <Space direction="vertical" size={12} className="w-full">
        <Typography.Text>期望副本数</Typography.Text>
        <InputNumber
          value={replicas}
          onChange={(value) => setReplicas(value ?? 1)}
          min={1}
          precision={0}
          className="w-full"
        />
        <Typography.Text type="secondary">
          调整请求将异步执行，可在详情栏的“当前操作”中查看进度。
        </Typography.Text>
      </Space>
    </Modal>
  );
}
