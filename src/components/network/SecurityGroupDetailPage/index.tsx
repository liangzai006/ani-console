import { withId } from "@/lib/id";
import {
  DataTable,
  DetailPageFrame,
  DetailPagePlaceholder,
  AliIcon,
  ResourceId,
  StatusTag,
} from "@/components/common";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, List, Modal, Space, Tag, Typography } from "@arco-design/web-react";
import { useState } from "react";
import { listInstances, type InstanceRecord } from "@/api/instances";
import {
  deleteNetworkSecurityGroup,
  deleteNetworkSecurityGroupRule,
  getNetworkSecurityGroup,
  getNetworkVpc,
  listNetworkSecurityGroupBindings,
  listNetworkSecurityGroupRules,
  type NetworkSecurityGroup,
  type NetworkSecurityGroupBinding,
  type NetworkVPC,
} from "@/api/network";

import {
  SecurityGroupRuleModal,
  type SecurityGroupRuleResource,
} from "@/components/network/SecurityGroupRuleModal";
import { formatDateTime } from "@/lib/format";

type SecurityGroup = NetworkSecurityGroup;
type SecurityGroupBinding = NetworkSecurityGroupBinding;
type Vpc = NetworkVPC;
type Instance = InstanceRecord;

type RelatedResource = {
  key: string;
  id: string;
  kind: "VPC" | "实例";
  name: string;
  status: string;
};

export function SecurityGroupDetailPage({ securityGroupId }: { securityGroupId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ruleEditor, setRuleEditor] = useState<{
    direction: SecurityGroupRuleResource["direction"];
    rule?: SecurityGroupRuleResource;
  } | null>(null);
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("security-group", securityGroupId),
        action: `安全组加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-security-group", securityGroupId],
    queryFn: () => getNetworkSecurityGroup(securityGroupId),
  });
  const vpc = useQuery({
    meta: {
      errorNotification: {
        id: withId("security-group-vpc", securityGroupId),
        action: `VPC 加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-vpc", detail.data?.vpc_id],
    queryFn: () => getNetworkVpc(detail.data!.vpc_id!),
    enabled: Boolean(detail.data?.vpc_id),
  });
  const bindings = useQuery({
    meta: {
      errorNotification: {
        id: withId("security-group-bindings", securityGroupId),
        action: `安全组绑定加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-security-group-bindings", securityGroupId],
    queryFn: () =>
      listNetworkSecurityGroupBindings(securityGroupId, {
        limit: 100,
        target_type: "instance",
      }),
  });
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
  const instances = useQuery({
    meta: {
      errorNotification: {
        id: withId("security-group-instances", securityGroupId),
        action: `关联实例加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["instances", "security-group-related"],
    queryFn: () => listInstances({ limit: 100 }),
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
      qc.invalidateQueries({
        queryKey: ["network-security-group-rules", securityGroupId],
      });
      qc.invalidateQueries({
        queryKey: ["network-security-group", securityGroupId],
      });
      qc.invalidateQueries({ queryKey: ["network-security-groups"] });
    },
  });
  const deleteSecurityGroup = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "security-group-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: () => deleteNetworkSecurityGroup(securityGroupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-security-groups"] });
      navigate({ to: "/security-groups" });
    },
  });

  if (!detail.data) return <DetailPagePlaceholder loading={detail.isLoading} />;

  const securityGroup = detail.data as SecurityGroup;
  const parentVpc = vpc.data as Vpc | undefined;
  const securityGroupBindings = (bindings.data?.items ?? []) as SecurityGroupBinding[];
  const instanceById = new Map(
    ((instances.data?.items ?? []) as Instance[]).map((instance) => [instance.id, instance]),
  );
  const networkRelatedResources: RelatedResource[] = parentVpc
    ? [
        {
          key: `vpc-${parentVpc.id}`,
          id: parentVpc.id,
          kind: "VPC",
          name: parentVpc.name,
          status: parentVpc.state,
        },
      ]
    : [];
  const computeRelatedResources: RelatedResource[] = securityGroupBindings.map((binding) => {
    const instance = instanceById.get(binding.target_id);
    return {
      key: binding.id,
      id: binding.target_id,
      kind: "实例",
      name: instance?.name ?? binding.target_id,
      status: instance?.state ?? "-",
    };
  });
  const renderRelatedList = (items: RelatedResource[], emptyText: string) => (
    <List<RelatedResource>
      loading={bindings.isLoading || instances.isLoading || vpc.isLoading}
      dataSource={items}
      noDataElement={<Empty description={emptyText} />}
      render={(resource) => (
        <div className="flex w-full items-center gap-3 px-5 py-3">
          <Tag className="shrink-0">{resource.kind}</Tag>
          <span className="min-w-0 flex-1 truncate">{resource.name}</span>
          <Typography.Text className="shrink-0" type="secondary">
            {resource.id}
          </Typography.Text>
          <StatusTag status={resource.status} />
        </div>
      )}
    />
  );
  const ruleItems = (rules.data?.items ?? []) as SecurityGroupRuleResource[];
  const renderRuleTable = (direction: SecurityGroupRuleResource["direction"]) => {
    const directionRules = ruleItems.filter((rule) => rule.direction === direction);
    return (
      <Space direction="vertical" size={12} className="w-full">
        <div className="flex items-center justify-between">
          <Typography.Text>
            共 <Typography.Text bold>{directionRules.length}</Typography.Text> 条
            {direction === "ingress" ? "入站" : "出站"}规则
          </Typography.Text>
          <Button type="primary" onClick={() => setRuleEditor({ direction })}>
            添加规则
          </Button>
        </div>
        <DataTable<SecurityGroupRuleResource>
          loading={rules.isLoading}
          rowActions={[
            {
              key: "edit",
              label: "编辑",
              onClick: (rule) => setRuleEditor({ direction, rule }),
            },
            {
              key: "delete",
              label: "删除",
              intent: "danger",
              loading: (rule) => deleteRule.isPending && deleteRule.variables?.id === rule.id,
              onClick: (rule) => {
                Modal.confirm({
                  title: "删除规则",
                  content: "确定删除这条安全组规则？",
                  okButtonProps: { status: "danger" },
                  onOk: () => deleteRule.mutateAsync(rule),
                });
              },
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
            {
              title: "描述",
              dataIndex: "description",
              placeholder: "-",
            },
          ]}
          data={directionRules}
          pagination={false}
          noDataElement={
            <Empty description={`暂无${direction === `ingress` ? `入站` : `出站`}规则`} />
          }
        />
      </Space>
    );
  };

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "网络" },
          { label: "安全组", to: "/security-groups" },
          { label: securityGroup.name },
        ]}
        title={securityGroup.name}
        status={<StatusTag status={securityGroup.state} />}
        icon={<AliIcon name="anquanzu" size={28} />}
        headerItems={[
          {
            label: "VPC",
            value: parentVpc?.name ?? securityGroup.vpc_id ?? "-",
          },
          {
            label: "创建时间",
            value: formatDateTime(securityGroup.created_at),
          },
        ]}
        actions={
          <Button
            status="danger"
            loading={deleteSecurityGroup.isPending}
            onClick={() =>
              Modal.confirm({
                title: "删除安全组",
                content: `确定删除「${securityGroup.name}」？安全组被实例使用时无法删除，请先解除关联。`,
                okButtonProps: { status: "danger" },
                onOk: () => deleteSecurityGroup.mutateAsync(),
              })
            }
          >
            删除
          </Button>
        }
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [
              { label: "ID", value: <ResourceId value={securityGroup.id} /> },
              { label: "名称", value: securityGroup.name },
              {
                label: "VPC",
                value: parentVpc?.name ?? securityGroup.vpc_id ?? "-",
              },
              { label: "描述", value: securityGroup.description || "-" },
              {
                label: "状态",
                value: <StatusTag status={securityGroup.state} />,
              },
              {
                label: "创建时间",
                value: formatDateTime(securityGroup.created_at),
              },
              {
                label: "更新时间",
                value: formatDateTime(securityGroup.updated_at),
              },
            ],
          },
        ]}
        tabs={[
          {
            key: "ingress",
            label: "入站规则",
            content: renderRuleTable("ingress"),
          },
          {
            key: "egress",
            label: "出站规则",
            content: renderRuleTable("egress"),
          },
          {
            key: "related",
            label: "关联资源",
            content: (
              <Space direction="vertical" size={12} className="w-full">
                <Typography.Text>
                  共{" "}
                  <Typography.Text bold>
                    {networkRelatedResources.length + computeRelatedResources.length}
                  </Typography.Text>{" "}
                  个关联对象
                </Typography.Text>
                <Card title={`网络关联 ${networkRelatedResources.length}`} size="small">
                  {renderRelatedList(networkRelatedResources, "暂无网络关联资源")}
                </Card>
                <Card title={`算力关联 ${computeRelatedResources.length}`} size="small">
                  {renderRelatedList(computeRelatedResources, "暂无算力关联资源")}
                </Card>
              </Space>
            ),
          },
        ]}
        onBack={() => navigate({ to: "/security-groups" })}
      />
      <SecurityGroupRuleModal
        visible={Boolean(ruleEditor)}
        securityGroupId={securityGroupId}
        direction={ruleEditor?.direction ?? "ingress"}
        rule={ruleEditor?.rule}
        onCancel={() => setRuleEditor(null)}
      />
    </>
  );
}
