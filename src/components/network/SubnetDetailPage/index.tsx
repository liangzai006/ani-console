import {
  deleteNetworkSubnet,
  getNetworkSubnet,
  getNetworkVpc,
  type NetworkSubnet,
  type NetworkVPC,
} from "@/api/network";
import {
  AliIcon,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
  StatusTag,
} from "@/components/common";
import { withId } from "@/lib/id";
import { Button, Dropdown, Menu, Modal } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { formatDateTime } from "@/lib/format";
import { navigationBreadcrumbsForPath } from "@/components/layouts/AppLayout/navigation";

type Subnet = NetworkSubnet;
type Vpc = NetworkVPC;
import { SubnetRelatedResources } from "./SubnetRelatedResources";
import { SubnetRoutes } from "./SubnetRoutes";

export function SubnetDetailPage({ subnetId }: { subnetId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("subnet", subnetId),
        action: `子网加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-subnet", subnetId],
    queryFn: () => getNetworkSubnet(subnetId),
  });
  const vpc = useQuery({
    meta: {
      errorNotification: {
        id: withId("subnet-vpc", subnetId),
        action: `VPC 加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-vpc", detail.data?.vpc_id],
    queryFn: () => getNetworkVpc(detail.data!.vpc_id),
    enabled: Boolean(detail.data?.vpc_id),
  });
  const deleteSubnet = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "subnet-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: () => deleteNetworkSubnet(subnetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-subnets"] });
      navigate({ to: "/subnets" });
    },
  });

  if (!detail.data) return <DetailPagePlaceholder loading={detail.isLoading} />;

  const subnet = detail.data as Subnet;
  const parentVpc = vpc.data as Vpc | undefined;
  const moreMenu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key !== "delete") return;
        Modal.confirm({
          title: "删除子网",
          content: `确定删除「${subnet.name}」？存在关联实例时无法删除，请先清理相关资源。`,
          okButtonProps: { status: "danger" },
          onOk: () => deleteSubnet.mutateAsync(undefined),
        });
      }}
    >
      <Menu.Item
        key="delete"
        disabled={deleteSubnet.isPending}
        style={{ color: "var(--color-danger-6)" }}
      >
        删除
      </Menu.Item>
    </Menu>
  );

  return (
    <DetailPageFrame
      breadcrumbs={[...navigationBreadcrumbsForPath("/subnets"), { label: subnet.name }]}
      title={subnet.name}
      status={<StatusTag status={subnet.state} />}
      icon={<AliIcon name="VPCwangluo" size={28} />}
      headerItems={[
        { label: "CIDR", value: subnet.cidr },
        { label: "创建时间", value: formatDateTime(subnet.created_at) },
      ]}
      actions={
        <Dropdown trigger="click" position="br" droplist={moreMenu}>
          <Button disabled={deleteSubnet.isPending} aria-label="更多操作" title="更多操作">
            <IconMoreVertical />
          </Button>
        </Dropdown>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: <ResourceId value={subnet.id} /> },
            { label: "名称", value: subnet.name },
            {
              label: "VPC",
              value: parentVpc?.name ?? (vpc.isLoading ? "加载中…" : subnet.vpc_id),
            },
            { label: "CIDR", value: subnet.cidr },
            { label: "网关", value: subnet.gateway ?? "-" },
            { label: "状态", value: <StatusTag status={subnet.state} /> },
            { label: "创建时间", value: formatDateTime(subnet.created_at) },
            { label: "更新时间", value: formatDateTime(subnet.updated_at) },
          ],
        },
      ]}
      tabs={[
        {
          key: "routes",
          label: "路由",
          content: <SubnetRoutes subnetId={subnetId} vpcId={subnet.vpc_id} />,
        },
        {
          key: "related",
          label: "关联资源",
          content: <SubnetRelatedResources subnetId={subnetId} />,
        },
      ]}
      onBack={() => navigate({ to: "/subnets" })}
    />
  );
}
