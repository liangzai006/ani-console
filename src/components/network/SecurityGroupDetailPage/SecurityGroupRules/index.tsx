import { deleteNetworkSecurityGroupRule, listNetworkSecurityGroupRules } from "@/api/network";
import { DataTable } from "@/components/common";
import {
  SecurityGroupRuleModal,
  type SecurityGroupRuleResource,
} from "@/components/network/SecurityGroupRuleModal";
import { withId } from "@/lib/id";
import { Button, Empty, Modal, Space, Tag, Typography } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function SecurityGroupRules({
  securityGroupId,
  direction,
}: {
  securityGroupId: string;
  direction: SecurityGroupRuleResource["direction"];
}) {
  const qc = useQueryClient();
  const [ruleEditor, setRuleEditor] = useState<SecurityGroupRuleResource | null | undefined>();
  const rules = useQuery({
    meta: {
      errorNotification: {
        id: withId("security-group-rules", securityGroupId),
        action: `安全组规则加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-security-group-rules", securityGroupId],
    queryFn: () => listNetworkSecurityGroupRules(securityGroupId, { limit: 100 }),
  });
  const deleteRule = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "security-group-rule-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (rule: SecurityGroupRuleResource) =>
      deleteNetworkSecurityGroupRule(securityGroupId, rule.id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["network-security-group-rules", securityGroupId],
      });
      void qc.invalidateQueries({
        queryKey: ["network-security-group", securityGroupId],
      });
      void qc.invalidateQueries({ queryKey: ["network-security-groups"] });
    },
  });
  const items = (rules.data?.items ?? []) as SecurityGroupRuleResource[];
  const directionRules = items.filter((rule) => rule.direction === direction);

  return (
    <Space direction="vertical" size={12} className="w-full">
      <div className="flex items-center justify-between">
        <Typography.Text>
          共 <Typography.Text bold>{directionRules.length}</Typography.Text> 条
          {direction === "ingress" ? "入站" : "出站"}规则
        </Typography.Text>
        <Button type="primary" onClick={() => setRuleEditor(null)}>
          添加规则
        </Button>
      </div>
      <DataTable<SecurityGroupRuleResource>
        loading={rules.isLoading}
        rowActions={[
          { key: "edit", label: "编辑", onClick: setRuleEditor },
          {
            key: "delete",
            label: "删除",
            intent: "danger",
            loading: (rule) => deleteRule.isPending && deleteRule.variables?.id === rule.id,
            onClick: (rule) =>
              void Modal.confirm({
                title: "删除规则",
                content: "确定删除这条安全组规则？",
                okButtonProps: { status: "danger" },
                onOk: () => deleteRule.mutateAsync(rule),
              }),
          },
        ]}
        columns={[
          { title: "优先级", dataIndex: "priority" },
          {
            title: "协议",
            render: (_, rule) => (rule.protocol === "all" ? "全部" : rule.protocol.toUpperCase()),
          },
          { title: "端口范围", dataIndex: "port_range" },
          {
            title: direction === "ingress" ? "来源 CIDR" : "目标 CIDR",
            dataIndex: "cidr",
          },
          {
            title: "策略",
            render: (_, rule) => (
              <Tag color={rule.action === "allow" ? "green" : "red"}>
                {rule.action === "allow" ? "允许" : "拒绝"}
              </Tag>
            ),
          },
          { title: "描述", dataIndex: "description", placeholder: "-" },
        ]}
        data={directionRules}
        pagination={false}
        noDataElement={
          <Empty description={`暂无${direction === "ingress" ? "入站" : "出站"}规则`} />
        }
      />
      {ruleEditor !== undefined && (
        <SecurityGroupRuleModal
          securityGroupId={securityGroupId}
          direction={direction}
          rule={ruleEditor}
          onCancel={() => setRuleEditor(undefined)}
        />
      )}
    </Space>
  );
}
