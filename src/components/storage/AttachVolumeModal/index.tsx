import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Form, Modal, Select, Typography } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { listOrThrow } from "@/lib/api-list";
import { getErrorMessage } from "@/lib/errors";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

type Instance = components["schemas"]["InstanceRecord"];
const attachableInstanceKinds = new Set<Instance["kind"]>(["vm", "container", "gpu_container"]);

export function AttachVolumeModal({
  visible,
  volumeId,
  onCancel,
  onAttached,
}: {
  visible: boolean;
  volumeId: string;
  onCancel: () => void;
  onAttached?: () => void;
}) {
  const qc = useQueryClient();
  const attachScope = useIdempotencyScope("storage-volume-attach", ["POST", volumeId]);
  const [instanceId, setInstanceId] = useState("");
  const instances = useQuery({
    queryKey: ["instances", "volume-attach"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/instances", {
          params: {
            query: asUncontractedQuery({
              limit: 100,
              kind: "vm,container,gpu_container",
              status: "running,stopped",
            }),
          },
        }),
      ),
    enabled: visible,
  });
  // TODO: 实例接口确认按 kind/status 过滤后，移除此处关联资源选择的本地兜底过滤。
  const instanceItems = ((instances.data?.items ?? []) as Instance[]).filter(
    (item) => attachableInstanceKinds.has(item.kind) && ["running", "stopped"].includes(item.state),
  );

  useEffect(() => {
    if (!instanceId || instanceItems.some((item) => item.id === instanceId)) return;
    setInstanceId("");
  }, [instanceId, instanceItems]);

  const attach = useMutation({
    mutationFn: async () => {
      if (!instanceId) throw new Error("请选择挂载实例");
      const submitData = { action: "attach_volume" as const, volume_id: volumeId };
      const { error } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
        params: { path: { instance_id: instanceId } },
        body: attachScope.withKey(submitData, [instanceId]),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      attachScope.reset([instanceId]);
      qc.invalidateQueries({ queryKey: ["instances"] });
      qc.invalidateQueries({ queryKey: ["volume", volumeId] });
      qc.invalidateQueries({ queryKey: ["volumes"] });
      setInstanceId("");
      onAttached?.();
      onCancel();
    },
    onError: (error) => showApiError(error),
  });

  return (
    <Modal
      visible={visible}
      title="挂载块存储卷"
      onCancel={() => {
        attachScope.reset();
        setInstanceId("");
        onCancel();
      }}
      onOk={() => attach.mutateAsync()}
      okButtonProps={{ disabled: !instanceId }}
      confirmLoading={attach.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="目标实例" required>
          <Select
            value={instanceId || undefined}
            onChange={setInstanceId}
            loading={instances.isLoading}
            placeholder="请选择运行中或已停止的 VM、容器或 GPU 容器"
            showSearch
            filterOption={(inputValue, option) =>
              String(option.props.children).toLowerCase().includes(inputValue.toLowerCase())
            }
          >
            {instanceItems.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name} · {item.kind} · {item.state}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {instances.error ? (
          <Alert
            type="error"
            showIcon
            content={getErrorMessage(instances.error, "实例列表加载失败")}
            className="mb-4"
          />
        ) : null}
        {!instances.isLoading && !instances.error && instanceItems.length === 0 ? (
          <Alert
            type="info"
            showIcon
            content="暂无可挂载的运行中或已停止 VM、容器或 GPU 容器"
            className="mb-4"
          />
        ) : null}
        <Typography.Text type="secondary">
          挂载操作提交后，卷状态和关联实例会自动刷新。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
