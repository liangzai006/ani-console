import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Form, Input, InputNumber, Modal, Select, Typography } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import {
  listNetworkSubnets,
  listNetworkVpcs,
  type NetworkSubnet,
  type NetworkVPC,
} from "@/api/network";
import {
  createFilesystem,
  createFilesystemMountTarget,
  type StorageFilesystem,
} from "@/api/storage/filesystems";
import { showApiError } from "@/lib/api-error";
import { getErrorMessage } from "@/lib/errors";

type Filesystem = StorageFilesystem;
type FilesystemProtocol = "nfs" | "cephfs";
type FilesystemPerformanceMode = "standard" | "throughput";
type Vpc = NetworkVPC;
type Subnet = NetworkSubnet;

export function CreateFilesystemModal({
  visible,
  onCancel,
  onCreated,
}: {
  visible: boolean;
  onCancel: () => void;
  onCreated?: (filesystem: Filesystem) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [protocol, setProtocol] = useState<FilesystemProtocol>("nfs");
  const [performanceMode, setPerformanceMode] = useState<FilesystemPerformanceMode>("standard");
  const [sizeGiB, setSizeGiB] = useState(100);
  const [vpcId, setVpcId] = useState("");
  const [subnetId, setSubnetId] = useState("");
  const vpcs = useQuery({
    queryKey: ["network-vpcs", "filesystem-create"],
    queryFn: () => listNetworkVpcs({ limit: 100 }),
    enabled: visible,
  });
  const subnets = useQuery({
    queryKey: ["network-subnets", "filesystem-create", vpcId],
    queryFn: () => listNetworkSubnets({ limit: 100, vpc_id: vpcId || undefined }),
    enabled: visible && !!vpcId,
  });
  // TODO: 子网接口确认按 vpc_id 过滤后，移除此处创建表单的本地兜底过滤。
  const availableSubnets = ((subnets.data?.items ?? []) as Subnet[]).filter(
    (item) => item.vpc_id === vpcId,
  );
  useEffect(() => {
    if (subnetId && !availableSubnets.some((item) => item.id === subnetId)) setSubnetId("");
  }, [availableSubnets, subnetId]);
  const reset = () => {
    setName("");
    setProtocol("nfs");
    setPerformanceMode("standard");
    setSizeGiB(100);
    setVpcId("");
    setSubnetId("");
  };
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("请输入文件存储名称");
      if (!Number.isInteger(sizeGiB) || sizeGiB < 1)
        throw new Error("容量必须是大于 0 的整数（GiB）");
      if (!vpcId) throw new Error("请选择 VPC");
      if (!subnetId) throw new Error("请选择子网");
      const createData = {
        name: trimmedName,
        protocol,
        performance_mode: performanceMode,
        size_gib: sizeGiB,
      };
      const data = await createFilesystem(createData);
      const mountTargetData = { vpc_id: vpcId, subnet_id: subnetId };
      await createFilesystemMountTarget(data.id, mountTargetData);
      return data;
    },
    onSuccess: (filesystem) => {
      qc.invalidateQueries({ queryKey: ["filesystems"] });
      reset();
      onCreated?.(filesystem);
      onCancel();
    },
    onError: (error) => showApiError(error),
  });
  return (
    <Modal
      visible={visible}
      title="创建文件存储"
      onCancel={() => {
        reset();
        onCancel();
      }}
      onOk={() => create.mutateAsync(undefined)}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="名称" required>
          <Input
            value={name}
            onChange={setName}
            placeholder="请输入文件存储名称"
            maxLength={64}
            showWordLimit
          />
        </Form.Item>
        <Form.Item label="协议" required>
          <Select value={protocol} onChange={setProtocol}>
            <Select.Option value="nfs">NFS</Select.Option>
            <Select.Option value="cephfs">CephFS</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="性能模式" required>
          <Select value={performanceMode} onChange={setPerformanceMode}>
            <Select.Option value="standard">标准型</Select.Option>
            <Select.Option value="throughput">吞吐型</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="容量 (GiB)" required>
          <InputNumber
            value={sizeGiB}
            min={1}
            precision={0}
            className="w-full"
            onChange={(value) => setSizeGiB(Number(value ?? 1))}
          />
        </Form.Item>
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
            placeholder={vpcId ? "请选择挂载目标子网" : "请先选择 VPC"}
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
        <Typography.Text type="secondary">
          创建完成后可在详情页查看挂载目标和挂载命令。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
