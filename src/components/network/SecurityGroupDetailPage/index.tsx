import { withId } from "@/lib/id";
import {
  DetailPageFrame,
  DetailPagePlaceholder,
  AliIcon,
  ResourceId,
  StatusTag,
} from "@/components/common";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dropdown, Menu, Modal } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import {
  deleteNetworkSecurityGroup,
  getNetworkSecurityGroup,
  getNetworkVpc,
  type NetworkSecurityGroup,
  type NetworkVPC,
} from "@/api/network";

import { formatDateTime } from "@/lib/format";
import { navigationBreadcrumbsForPath } from "@/components/layouts/AppLayout/navigation";
import { SecurityGroupRelatedResources } from "./SecurityGroupRelatedResources";
import { SecurityGroupRules } from "./SecurityGroupRules";

type SecurityGroup = NetworkSecurityGroup;
type Vpc = NetworkVPC;

export function SecurityGroupDetailPage({ securityGroupId }: { securityGroupId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
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
  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          ...navigationBreadcrumbsForPath("/security-groups"),
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
          <Dropdown
            trigger="click"
            position="br"
            droplist={
              <Menu>
                <Menu.Item
                  key="delete"
                  disabled={deleteSecurityGroup.isPending}
                  style={{ color: "var(--color-danger-6)" }}
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
                </Menu.Item>
              </Menu>
            }
          >
            <Button disabled={deleteSecurityGroup.isPending} aria-label="更多操作" title="更多操作">
              <IconMoreVertical />
            </Button>
          </Dropdown>
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
            content: <SecurityGroupRules securityGroupId={securityGroupId} direction="ingress" />,
          },
          {
            key: "egress",
            label: "出站规则",
            content: <SecurityGroupRules securityGroupId={securityGroupId} direction="egress" />,
          },
          {
            key: "related",
            label: "关联资源",
            content: (
              <SecurityGroupRelatedResources
                securityGroupId={securityGroupId}
                parentVpc={parentVpc}
                vpcLoading={vpc.isLoading}
              />
            ),
          },
        ]}
        onBack={() => navigate({ to: "/security-groups" })}
      />
    </>
  );
}
