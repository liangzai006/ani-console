import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Form, Modal, Select, Typography } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { listOrThrow } from "@/lib/api-list";
import { getErrorMessage } from "@/lib/errors";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

type Vpc = components["schemas"]["NetworkVPC"];
type Subnet = components["schemas"]["NetworkSubnet"];

export function CreateFilesystemMountTargetModal({
  visible,
  filesystemId,
  onCancel,
}: {
  visible: boolean;
  filesystemId: string;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const createScope = useIdempotencyScope("storage-filesystem-mount-target-create", [
    "POST",
    filesystemId,
  ]);
  const [vpcId, setVpcId] = useState("");
  const [subnetId, setSubnetId] = useState("");
  const vpcs = useQuery({
    queryKey: ["network-vpcs", "filesystem-mount-target-create"],
    queryFn: () =>
      listOrThrow(() => coreApi.GET("/networks/vpcs", { params: { query: { limit: 100 } } })),
    enabled: visible,
  });
  const subnets = useQuery({
    queryKey: ["network-subnets", "filesystem-mount-target-create", vpcId],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/subnets", {
          params: { query: { limit: 100, vpc_id: vpcId || undefined } },
        }),
      ),
    enabled: visible && !!vpcId,
  });
  // TODO: 子网接口确认按 vpc_id 过滤后，移除此处创建表单的本地兜底过滤。
  const availableSubnets = ((subnets.data?.items ?? []) as Subnet[]).filter(
    (item) => item.vpc_id === vpcId,
  );

  useEffect(() => {
    if (subnetId && !availableSubnets.some((item) => item.id === subnetId)) setSubnetId("");
  }, [availableSubnets, subnetId]);

  const close = () => {
    createScope.reset();
    setVpcId("");
    setSubnetId("");
    onCancel();
  };
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      if (!vpcId) throw new Error("请选择 VPC");
      if (!subnetId) throw new Error("请选择子网");
      const submitData = { vpc_id: vpcId, subnet_id: subnetId };
      const { error } = await coreApi.POST("/filesystems/{filesystem_id}/mount-targets", {
        params: { path: { filesystem_id: filesystemId } },
        body: createScope.withKey(submitData),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filesystem-mounts", filesystemId] });
      qc.invalidateQueries({ queryKey: ["filesystems"] });
      close();
    },
    onError: (error) => showApiError(error),
  });

  return (
    <Modal
      visible={visible}
      title="创建挂载目标"
      onCancel={close}
      onOk={() => create.mutateAsync(undefined)}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Alert type="info" showIcon content="挂载目标用于为指定 VPC 和子网提供文件存储访问地址。" />
        <Form.Item label="VPC" required>
          <Select
            value={vpcId || undefined}
            onChange={setVpcId}
            loading={vpcs.isLoading}
            placeholder="请选择 VPC"
          >
            {((vpcs.data?.items ?? []) as Vpc[]).map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name} · {item.cidr}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="子网" required>
          <Select
            value={subnetId || undefined}
            onChange={setSubnetId}
            loading={subnets.isLoading}
            disabled={!vpcId}
            placeholder={vpcId ? "请选择子网" : "请先选择 VPC"}
          >
            {availableSubnets.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name} · {item.cidr}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {vpcs.error || subnets.error ? (
          <Alert
            type="error"
            showIcon
            content={getErrorMessage(vpcs.error ?? subnets.error, "网络选项加载失败")}
          />
        ) : null}
        <Typography.Text type="secondary">IP 地址由后端在所选子网中分配。</Typography.Text>
      </Form>
    </Modal>
  );
}
