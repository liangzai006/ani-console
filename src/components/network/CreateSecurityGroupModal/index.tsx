import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Form, Input, Modal, Select, Typography } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { listOrThrow } from "@/lib/api-list";
import { getErrorMessage } from "@/lib/errors";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

type SecurityGroupRule = components["schemas"]["NetworkSecurityGroupRule"];
type Vpc = components["schemas"]["NetworkVPC"];
type RuleTemplate = "common" | "open" | "custom";

const RULE_TEMPLATES: Record<RuleTemplate, SecurityGroupRule[]> = {
  common: [
    { direction: "ingress", protocol: "tcp", port_range: "22", cidr: "0.0.0.0/0", action: "allow" },
    {
      direction: "ingress",
      protocol: "tcp",
      port_range: "3389",
      cidr: "0.0.0.0/0",
      action: "allow",
    },
    {
      direction: "ingress",
      protocol: "icmp",
      port_range: "all",
      cidr: "0.0.0.0/0",
      action: "allow",
    },
  ],
  open: [
    {
      direction: "ingress",
      protocol: "all",
      port_range: "all",
      cidr: "0.0.0.0/0",
      action: "allow",
    },
    { direction: "egress", protocol: "all", port_range: "all", cidr: "0.0.0.0/0", action: "allow" },
  ],
  custom: [],
};

export function CreateSecurityGroupModal({
  visible,
  defaultVpcId,
  onCancel,
  onCreated,
}: {
  visible: boolean;
  defaultVpcId?: string;
  onCancel: () => void;
  onCreated?: (securityGroup: components["schemas"]["NetworkSecurityGroup"]) => void;
}) {
  const qc = useQueryClient();
  const createScope = useIdempotencyScope("network-security-group-create", ["POST"]);
  const [name, setName] = useState("");
  const [vpcId, setVpcId] = useState(defaultVpcId ?? "");
  const [ruleTemplate, setRuleTemplate] = useState<RuleTemplate>("common");
  const vpcs = useQuery({
    queryKey: ["network-vpcs", "security-group-create"],
    queryFn: () =>
      listOrThrow(() => coreApi.GET("/networks/vpcs", { params: { query: { limit: 100 } } })),
    enabled: visible,
  });

  useEffect(() => {
    if (visible) setVpcId(defaultVpcId ?? "");
  }, [defaultVpcId, visible]);
  const reset = () => {
    createScope.reset();
    setName("");
    setVpcId(defaultVpcId ?? "");
    setRuleTemplate("common");
  };
  const create = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("请输入安全组名称");
      if (!vpcId) throw new Error("请选择绑定的 VPC");
      const submitData = {
        name: trimmedName,
        vpc_id: vpcId,
        rules: RULE_TEMPLATES[ruleTemplate],
      };
      const { data, error } = await coreApi.POST("/networks/security-groups", {
        body: createScope.withKey(submitData),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["network-security-groups"] });
      reset();
      onCreated?.(data);
      onCancel();
    },
    onError: (error) => showApiError(error),
  });

  return (
    <Modal
      visible={visible}
      title="创建安全组"
      onCancel={() => {
        reset();
        onCancel();
      }}
      onOk={() => create.mutateAsync()}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="名称" required>
          <Input
            value={name}
            onChange={setName}
            placeholder="请输入安全组名称"
            maxLength={64}
            showWordLimit
          />
        </Form.Item>
        <Form.Item label="绑定 VPC" required>
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
        <Form.Item label="规则模板" required>
          <Select value={ruleTemplate} onChange={setRuleTemplate}>
            <Select.Option value="common">常用远程端口（22 / 3389 / ICMP）</Select.Option>
            <Select.Option value="open">放通全部（仅试验）</Select.Option>
            <Select.Option value="custom">自定义空规则</Select.Option>
          </Select>
        </Form.Item>
        <Typography.Text type="secondary">
          创建后可在安全组详情页逐条添加或编辑入站、出站规则。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
