import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Form, Input, Modal, Select, Typography } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { Ipv4CidrInput } from "@/components/common";
import { listOrThrow } from "@/lib/api-list";
import { getErrorMessage } from "@/lib/errors";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { ipv4CidrError, requireIpv4Cidr } from "@/lib/validators";

type NetworkRoute = components["schemas"]["NetworkRoute"];
type Vpc = components["schemas"]["NetworkVPC"];

export function CreateRouteModal({
  visible,
  defaultVpcId,
  onCancel,
  onCreated,
}: {
  visible: boolean;
  defaultVpcId?: string;
  onCancel: () => void;
  onCreated?: (route: NetworkRoute) => void;
}) {
  const qc = useQueryClient();
  const createScope = useIdempotencyScope("network-route-create", ["POST"]);
  const [vpcId, setVpcId] = useState(defaultVpcId ?? "");
  const [destinationCidr, setDestinationCidr] = useState("0.0.0.0/0");
  const [nextHopType, setNextHopType] = useState<NetworkRoute["next_hop_type"]>("gateway");
  const [nextHopId, setNextHopId] = useState("");
  const [name, setName] = useState("");
  const vpcs = useQuery({
    queryKey: ["network-vpcs", "route-create"],
    queryFn: () =>
      listOrThrow(() => coreApi.GET("/networks/vpcs", { params: { query: { limit: 100 } } })),
    enabled: visible,
  });
  const cidrError = ipv4CidrError(destinationCidr, "目标网段");
  useEffect(() => {
    if (visible) setVpcId(defaultVpcId ?? "");
  }, [defaultVpcId, visible]);
  const reset = () => {
    createScope.reset();
    setVpcId(defaultVpcId ?? "");
    setDestinationCidr("0.0.0.0/0");
    setNextHopType("gateway");
    setNextHopId("");
    setName("");
  };
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      if (!vpcId) throw new Error("请选择 VPC");
      if (!name.trim()) throw new Error("请输入路由名称");
      if (cidrError) throw new Error(cidrError);
      if (!nextHopId.trim()) throw new Error("请输入下一跳 ID");
      const submitData = {
        vpc_id: vpcId,
        destination_cidr: requireIpv4Cidr(destinationCidr, "目标网段"),
        next_hop_type: nextHopType,
        next_hop_id: nextHopId.trim(),
        description: name.trim(),
      };
      const { data, error } = await coreApi.POST("/networks/routes", {
        body: createScope.withKey(submitData),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["network-routes"] });
      reset();
      onCreated?.(data);
      onCancel();
    },
    onError: (error) => showApiError(error),
  });
  return (
    <Modal
      visible={visible}
      title="创建路由"
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
            placeholder="请输入路由名称"
            maxLength={128}
            showWordLimit
          />
        </Form.Item>
        <Form.Item label="VPC" required>
          <Select
            value={vpcId || undefined}
            onChange={setVpcId}
            loading={vpcs.isLoading}
            placeholder="请选择 VPC"
            showSearch
            filterOption={(inputValue, option) =>
              String(option.props.children).toLowerCase().includes(inputValue.toLowerCase())
            }
          >
            {((vpcs.data?.items ?? []) as Vpc[]).map((vpc) => (
              <Select.Option key={vpc.id} value={vpc.id}>
                {vpc.name} · {vpc.cidr}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {vpcs.error ? (
          <Alert
            type="error"
            showIcon
            content={getErrorMessage(vpcs.error, "VPC 列表加载失败")}
            className="mb-4"
          />
        ) : null}
        <Form.Item
          label="目标网段"
          required
          validateStatus={cidrError ? "error" : undefined}
          help={cidrError}
        >
          <Ipv4CidrInput
            value={destinationCidr}
            onChange={setDestinationCidr}
            placeholder="0.0.0.0"
            withPrefix
          />
        </Form.Item>
        <Form.Item label="下一跳类型" required>
          <Select value={nextHopType} onChange={setNextHopType}>
            <Select.Option value="gateway">网关</Select.Option>
            <Select.Option value="instance">实例</Select.Option>
            <Select.Option value="nat">NAT</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="下一跳 ID" required>
          <Input
            value={nextHopId}
            onChange={setNextHopId}
            placeholder="请输入网关、实例或 NAT 资源 ID"
          />
        </Form.Item>
        <Typography.Text type="secondary">
          创建后不可编辑；如需变更目标或下一跳，请删除后重新创建。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
