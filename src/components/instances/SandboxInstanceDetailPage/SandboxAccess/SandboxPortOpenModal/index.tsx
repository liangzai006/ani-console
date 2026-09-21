import { createSandboxPort, type InstanceRecord } from "@/api/instances";
import { Form, Input, InputNumber, Modal, Select } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

type SandboxInstance = InstanceRecord;

export function SandboxPortOpenModal({
  instance,
  onCancel,
  onSuccess,
}: {
  instance: SandboxInstance;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [port, setPort] = useState(8080);
  const [portName, setPortName] = useState("");
  const [protocol, setProtocol] = useState<"tcp" | "http">("http");

  const createPort = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "预览端口开放",
        successText: "预览端口已开放",
        errorFallback: "预览端口开放失败",
      },
    },
    mutationFn: async () => {
      const submitData = {
        port,
        name: portName.trim() || undefined,
        protocol,
      };
      return createSandboxPort(instance.id, submitData);
    },
    onSuccess: () => {
      onCancel();
      onSuccess();
    },
  });

  return (
    <Modal
      title="开放预览端口"
      visible
      confirmLoading={createPort.isPending}
      onCancel={onCancel}
      onOk={() => createPort.mutate()}
      okButtonProps={{ disabled: port < 1 || port > 65535 }}
      unmountOnExit
    >
      <Form layout="vertical" disabled={createPort.isPending}>
        <Form.Item label="端口" required>
          <InputNumber
            value={port}
            min={1}
            max={65535}
            precision={0}
            onChange={(value) => setPort(Number(value) || 0)}
          />
        </Form.Item>
        <Form.Item label="名称">
          <Input value={portName} onChange={setPortName} placeholder="例如 web-preview" />
        </Form.Item>
        <Form.Item label="协议" required>
          <Select
            value={protocol}
            onChange={setProtocol}
            options={[
              { label: "HTTP", value: "http" },
              { label: "TCP", value: "tcp" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
