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
import { deleteNetworkVpc, getNetworkVpc, type NetworkVPC } from "@/api/network";

import { formatDateTime } from "@/lib/format";
import { VpcRelatedResources } from "./VpcRelatedResources";
import { VpcRoutes } from "./VpcRoutes";
import { VpcSubnets } from "./VpcSubnets";

type Vpc = NetworkVPC;

export function VpcDetailPage({ vpcId }: { vpcId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("vpc", vpcId),
        action: `VPC 加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-vpc", vpcId],
    queryFn: () => getNetworkVpc(vpcId),
  });
  const deleteVpc = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "vpc-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: () => deleteNetworkVpc(vpcId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-vpcs"] });
      navigate({ to: "/vpcs" });
    },
  });

  if (!detail.data) return <DetailPagePlaceholder loading={detail.isLoading} />;

  const vpc = detail.data as Vpc;
  const moreMenu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key !== "delete") return;
        Modal.confirm({
          title: "删除 VPC",
          content: `确定删除「${vpc.name}」？存在子网或关联资源时无法删除，请先清理相关资源。`,
          okButtonProps: { status: "danger" },
          onOk: () => deleteVpc.mutateAsync(undefined),
        });
      }}
    >
      <Menu.Item
        key="delete"
        disabled={deleteVpc.isPending}
        style={{ color: "var(--color-danger-6)" }}
      >
        删除
      </Menu.Item>
    </Menu>
  );

  return (
    <DetailPageFrame
      breadcrumbs={[{ label: "网络" }, { label: "VPC", to: "/vpcs" }, { label: vpc.name }]}
      title={vpc.name}
      status={<StatusTag status={vpc.state} />}
      icon={<AliIcon name="VPCwangluo" size={28} />}
      headerItems={[
        { label: "CIDR", value: vpc.cidr },
        { label: "创建时间", value: formatDateTime(vpc.created_at) },
      ]}
      actions={
        <Dropdown trigger="click" position="br" droplist={moreMenu}>
          <Button disabled={deleteVpc.isPending} aria-label="更多操作" title="更多操作">
            <IconMoreVertical />
          </Button>
        </Dropdown>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: <ResourceId value={vpc.id} /> },
            { label: "名称", value: vpc.name },
            { label: "CIDR", value: vpc.cidr },
            { label: "状态", value: <StatusTag status={vpc.state} /> },
            { label: "创建时间", value: formatDateTime(vpc.created_at) },
            { label: "更新时间", value: formatDateTime(vpc.updated_at) },
          ],
        },
      ]}
      tabs={[
        {
          key: "subnets",
          label: "子网",
          content: <VpcSubnets vpcId={vpcId} />,
        },
        {
          key: "routes",
          label: "路由",
          content: <VpcRoutes vpcId={vpcId} />,
        },
        {
          key: "related",
          label: "关联资源",
          content: <VpcRelatedResources vpcId={vpcId} />,
        },
      ]}
      onBack={() => navigate({ to: "/vpcs" })}
    />
  );
}
