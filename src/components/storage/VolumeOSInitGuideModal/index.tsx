import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Empty,
  Message,
  Modal,
  Space,
  Spin,
  Typography,
} from "@arco-design/web-react";
import { completeVolumeOSInit, getVolumeOSInitGuide } from "@/api/storage/volumes";
import { showApiError } from "@/lib/api-error";
import { ApiErrorAlert } from "@/components/common";

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
    queryKey: ["volume-os-init-guide", volumeId],
    queryFn: () => getVolumeOSInitGuide(volumeId),
    enabled: visible,
  });
  const complete = useMutation({
    mutationFn: (_: undefined) => completeVolumeOSInit(volumeId, { mode: "done" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volume", volumeId] });
      qc.invalidateQueries({ queryKey: ["volume-os-init-guide", volumeId] });
      onCancel();
    },
    onError: (error) => showApiError(error),
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
      ) : guide.error ? (
        <ApiErrorAlert error={guide.error} />
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
                    Message.success("命令已复制");
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
      ) : null}
    </Modal>
  );
}
