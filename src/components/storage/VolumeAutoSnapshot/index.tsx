import {
  updateVolumeAutoSnapshotPolicy,
  type StorageVolumeAutoSnapshotPolicy,
  type StorageVolumeAutoSnapshotPolicyUpdateInput,
} from "@/api/storage/volumes";
import { validateForm } from "@/lib/form";
import {
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
} from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type VolumeAutoSnapshotProps = {
  volumeId: string;
  policy?: StorageVolumeAutoSnapshotPolicy;
};

export function VolumeAutoSnapshot({ volumeId, policy }: VolumeAutoSnapshotProps) {
  const [form] = Form.useForm<StorageVolumeAutoSnapshotPolicyUpdateInput>();
  const [editorVisible, setEditorVisible] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (policy) {
      form.setFieldsValue(policy);
    }
  }, [form, policy]);

  const updatePolicy = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "保存自动快照策略",
        successText: "自动快照策略已保存",
        errorFallback: "自动快照策略保存失败",
      },
    },
    mutationFn: (values: StorageVolumeAutoSnapshotPolicyUpdateInput) =>
      updateVolumeAutoSnapshotPolicy(volumeId, values),
    onSuccess: () => {
      setEditorVisible(false);
      void queryClient.invalidateQueries({ queryKey: ["volume", volumeId] });
      void queryClient.invalidateQueries({ queryKey: ["volumes"] });
    },
  });

  if (!policy) {
    return <Empty description="暂无自动快照策略" />;
  }

  return (
    <>
      <Space direction="vertical" size={16} className="w-full">
        <div className="flex justify-end">
          <Button
            onClick={() => {
              form.setFieldsValue(policy);
              setEditorVisible(true);
            }}
          >
            编辑策略
          </Button>
        </div>
        <Descriptions
          border
          column={1}
          data={[
            { label: "启用状态", value: policy.enabled ? "已开启" : "已关闭" },
            { label: "保留天数", value: `${policy.retain_days} 天` },
            { label: "执行计划", value: policy.schedule },
          ]}
        />
      </Space>
      <Modal
        title="编辑自动快照策略"
        visible={editorVisible}
        confirmLoading={updatePolicy.isPending}
        okText="确认保存"
        onOk={() =>
          validateForm<StorageVolumeAutoSnapshotPolicyUpdateInput>(form).then((values) =>
            updatePolicy.mutateAsync(values),
          )
        }
        onCancel={() => setEditorVisible(false)}
      >
        <Form form={form} layout="vertical" initialValues={policy}>
          <Form.Item label="启用自动快照" field="enabled" triggerPropName="checked">
            <Switch checkedText="开启" uncheckedText="关闭" />
          </Form.Item>
          <Form.Item
            label="保留天数"
            field="retain_days"
            rules={[{ required: true, type: "number", min: 1, max: 365 }]}
          >
            <InputNumber min={1} max={365} suffix="天" className="w-full" />
          </Form.Item>
          <Form.Item
            label="执行计划"
            field="schedule"
            rules={[{ required: true, message: "请输入执行计划" }]}
            extra="使用支持的计划格式，例如 daily@02:00。"
          >
            <Input placeholder="daily@02:00" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
