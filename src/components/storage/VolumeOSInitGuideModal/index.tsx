import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Empty, Modal, Space, Spin, Typography } from "@arco-design/web-react";
import { completeVolumeOSInit, getVolumeOSInitGuide } from "@/api/storage/volumes";

import { showMessage } from "@/lib/feedback";
import { withId } from "@/lib/id";

export function VolumeOSInitGuideModal({
  visible,
  volumeId,
  onCancel,
}: {
  visible: boolean;
  volumeId: string;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const guide = useQuery({
    meta: {
      errorNotification: {
        id: withId("volume-init", volumeId),
        action: "初始化说明加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["volume-os-init-guide", volumeId],
    queryFn: () => getVolumeOSInitGuide(volumeId),
    enabled: visible,
  });
  const complete = useMutation({
    meta: { feedback: { channel: "message", action: "操作", errorFallback: "请求失败" } },
    mutationFn: (_: undefined) => completeVolumeOSInit(volumeId, { mode: "done" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volume", volumeId] });
      qc.invalidateQueries({ queryKey: ["volume-os-init-guide", volumeId] });
      onCancel();
    },
  });
  return (
    <Modal
      visible={visible}
      title="初始化引导"
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>关闭</Button>
          <Button
            type="primary"
            loading={complete.isPending}
            disabled={!guide.data}
            onClick={() => complete.mutateAsync(undefined)}
          >
            标记已完成
          </Button>
        </Space>
      }
      unmountOnExit
    >
      {guide.isLoading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : guide.data ? (
        <Space direction="vertical" size={16} className="w-full">
          <Alert type="info" showIcon content={guide.data.hint || `设备：${guide.data.device}`} />
          <Typography.Text>
            设备：{guide.data.device || "-"}　状态：{guide.data.status || "-"}
          </Typography.Text>
          {guide.data.steps.length ? (
            guide.data.steps.map((step, index) => (
              <div key={`${index}-${step.title}`}>
                <Typography.Title heading={6}>
                  {index + 1}. {step.title}
                </Typography.Title>
                <pre
                  className="m-0 overflow-auto rounded p-3"
                  style={{
                    background: "var(--color-fill-2)",
                    color: "var(--color-text-1)",
                  }}
                >
                  {step.command}
                </pre>
                <Button
                  type="text"
                  size="small"
                  onClick={() => {
                    void navigator.clipboard.writeText(step.command);
                    showMessage({ type: "success", content: "命令已复制" });
                  }}
                >
                  复制命令
                </Button>
              </div>
            ))
          ) : (
            <Empty description="当前无需执行初始化步骤" />
          )}
        </Space>
      ) : (
        <div className="min-h-32" />
      )}
    </Modal>
  );
}
