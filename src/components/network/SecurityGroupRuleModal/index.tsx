import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, InputNumber, Modal, Select } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

export type SecurityGroupRuleResource = components["schemas"]["NetworkSecurityGroupRuleResource"];
type Direction = SecurityGroupRuleResource["direction"];
type RuleDraft = Pick<
  SecurityGroupRuleResource,
  "priority" | "direction" | "protocol" | "port_range" | "cidr" | "action"
> & { description?: string };

const emptyRule = (direction: Direction): RuleDraft => ({
  priority: 100,
  direction,
  protocol: "tcp",
  port_range: "22",
  cidr: "0.0.0.0/0",
  action: "allow",
  description: "",
});

export function SecurityGroupRuleModal({
  visible,
  securityGroupId,
  direction,
  rule,
  onCancel,
  onSuccess,
}: {
  visible: boolean;
  securityGroupId: string;
  direction: Direction;
  rule?: SecurityGroupRuleResource | null;
  onCancel: () => void;
  onSuccess?: () => void;
}) {
  const qc = useQueryClient();
  const saveScope = useIdempotencyScope("network-security-group-rule-save", [
    rule ? "PUT" : "POST",
    securityGroupId,
    rule?.id,
  ]);
  const [draft, setDraft] = useState<RuleDraft>(() => emptyRule(direction));
  useEffect(() => {
    if (visible)
      setDraft(
        rule
          ? {
              priority: rule.priority,
              direction: rule.direction,
              protocol: rule.protocol,
              port_range: rule.port_range,
              cidr: rule.cidr,
              action: rule.action,
              description: rule.description ?? "",
            }
          : emptyRule(direction),
      );
  }, [direction, rule, visible]);
  const save = useMutation({
    mutationFn: async () => {
      const submitData = {
        ...draft,
        port_range: draft.port_range.trim(),
        cidr: draft.cidr.trim(),
        description: draft.description?.trim() || undefined,
      };
      if (!submitData.port_range) throw new Error("请输入端口范围");
      if (!submitData.cidr) throw new Error("请输入来源 CIDR");
      if (rule) {
        const { error } = await coreApi.PUT(
          "/networks/security-groups/{security_group_id}/rules/{rule_id}",
          {
            params: { path: { security_group_id: securityGroupId, rule_id: rule.id } },
            body: saveScope.withKey(submitData),
          },
        );
        if (error) throw error;
      } else {
        const { error } = await coreApi.POST(
          "/networks/security-groups/{security_group_id}/rules",
          {
            params: { path: { security_group_id: securityGroupId } },
            body: saveScope.withKey(submitData),
          },
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      saveScope.reset();
      qc.invalidateQueries({ queryKey: ["network-security-group-rules", securityGroupId] });
      qc.invalidateQueries({ queryKey: ["network-security-group", securityGroupId] });
      qc.invalidateQueries({ queryKey: ["network-security-groups"] });
      onSuccess?.();
      onCancel();
    },
    onError: (error) => showApiError(error),
  });

  return (
    <Modal
      visible={visible}
      title={`${rule ? "编辑" : "添加"}${direction === "ingress" ? "入站" : "出站"}规则`}
      okText={rule ? "保存" : "添加"}
      onCancel={() => {
        saveScope.reset();
        onCancel();
      }}
      onOk={() => save.mutateAsync()}
      confirmLoading={save.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="优先级" required extra="数值越小，优先级越高">
          <InputNumber
            value={draft.priority}
            min={1}
            max={32766}
            onChange={(priority) => setDraft({ ...draft, priority })}
            className="w-full"
          />
        </Form.Item>
        <Form.Item label="协议" required>
          <Select value={draft.protocol} onChange={(protocol) => setDraft({ ...draft, protocol })}>
            <Select.Option value="tcp">TCP</Select.Option>
            <Select.Option value="udp">UDP</Select.Option>
            <Select.Option value="icmp">ICMP</Select.Option>
            <Select.Option value="all">全部</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="端口范围" required>
          <Input
            value={draft.port_range}
            onChange={(port_range) => setDraft({ ...draft, port_range })}
            placeholder="例如 80、80-443；全部协议可填 all"
          />
        </Form.Item>
        <Form.Item label={direction === "ingress" ? "来源 CIDR" : "目标 CIDR"} required>
          <Input
            value={draft.cidr}
            onChange={(cidr) => setDraft({ ...draft, cidr })}
            placeholder="例如 0.0.0.0/0"
          />
        </Form.Item>
        <Form.Item label="策略" required>
          <Select value={draft.action} onChange={(action) => setDraft({ ...draft, action })}>
            <Select.Option value="allow">允许</Select.Option>
            <Select.Option value="deny">拒绝</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea
            value={draft.description}
            onChange={(description) => setDraft({ ...draft, description })}
            maxLength={200}
            showWordLimit
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
