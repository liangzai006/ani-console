import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Modal, Typography } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import {
  Ipv4CidrInput,
  ListDataTable,
  ListNameCell,
  ListPageFrame,
  ListPageHeader,
  ListRowActionButton,
  ListRowActions,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
  StatusTag,
} from "@/components/common";
import { formatDateTime } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";
import { listOrThrow } from "@/lib/api-list";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { ipv4CidrError, requireIpv4Cidr } from "@/lib/validators";

type Vpc = components["schemas"]["NetworkVPC"];
type Subnet = components["schemas"]["NetworkSubnet"];
type NetworkRoute = components["schemas"]["NetworkRoute"];
type VpcStatusFilter = "all" | Vpc["state"];
type VpcSearchField = "name" | "id";

export const Route = createFileRoute("/_authenticated/networks/vpcs/")({
  component: VpcsPage,
});

function VpcsPage() {
  return <VpcList />;
}

function VpcList() {
  const qc = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const [name, setName] = useState("");
  const [cidr, setCidr] = useState("10.0.0.0/16");
  const [status, setStatus] = useState<VpcStatusFilter>("all");
  const [searchField, setSearchField] = useState<VpcSearchField>("name");
  const [searchText, setSearchText] = useState("");
  const cidrError = ipv4CidrError(cidr, "IPv4 CIDR");

  const {
    query: vpcs,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  } = useCursorPaginatedQuery<Vpc>({
    queryKey: ["network-vpcs"],
    cursorScope: `${status}:${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      const { data, error } = await coreApi.GET("/networks/vpcs", {
        params: { query: { limit, cursor } },
      });
      if (error || !data) throw error ?? new Error("VPC 列表未返回结果");
      return data;
    },
  });
  const subnets = useQuery({
    queryKey: ["network-subnets", "vpc-counts"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/subnets", { params: { query: { limit: 100 } } }),
      ),
  });
  const routes = useQuery({
    queryKey: ["network-routes", "vpc-counts"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/routes", { params: { query: { limit: 100 } } }),
      ),
  });

  const createVpc = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("请输入 VPC 名称");
      const { error } = await coreApi.POST("/networks/vpcs", {
        body: {
          name: trimmedName,
          cidr: requireIpv4Cidr(cidr, "IPv4 CIDR"),
          idempotency_key: newIdempotencyKey(),
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCreateVisible(false);
      setName("");
      setCidr("10.0.0.0/16");
      resetPagination();
      qc.invalidateQueries({ queryKey: ["network-vpcs"] });
    },
    onError: (error) => showApiError(error),
  });

  const deleteVpc = useMutation({
    mutationFn: async (vpc: Vpc) => {
      const { error } = await coreApi.DELETE("/networks/vpcs/{vpc_id}", {
        params: { path: { vpc_id: vpc.id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      resetPagination();
      qc.invalidateQueries({ queryKey: ["network-vpcs"] });
      qc.invalidateQueries({ queryKey: ["network-subnets"] });
      qc.invalidateQueries({ queryKey: ["network-routes"] });
    },
    onError: (error) => showApiError(error),
  });

  const items = (vpcs.data?.items ?? []) as Vpc[];
  const subnetCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const subnet of (subnets.data?.items ?? []) as Subnet[])
      counts.set(subnet.vpc_id, (counts.get(subnet.vpc_id) ?? 0) + 1);
    return counts;
  }, [subnets.data?.items]);
  const routeTableNames = useMemo(() => {
    const names = new Map<string, string[]>();
    for (const route of (routes.data?.items ?? []) as NetworkRoute[]) {
      names.set(route.vpc_id, [
        ...(names.get(route.vpc_id) ?? []),
        route.description?.trim() || route.id,
      ]);
    }
    return names;
  }, [routes.data?.items]);
  const statusCounts = useMemo(
    () => ({
      all: items.length,
      available: items.filter((item) => item.state === "available").length,
      pending: items.filter((item) => item.state === "pending").length,
      failed: items.filter((item) => item.state === "failed").length,
    }),
    [items],
  );
  // TODO: /networks/vpcs 暂不支持状态与关键字查询，接口补齐后传递 status/searchField/searchText。
  const paginationTotal = vpcs.data?.total ?? items.length;
  useListErrorNotification({
    id: "vpcs-list",
    title: "VPC 列表加载失败",
    error: vpcs.error,
  });

  const columns: Array<ListColumn<Vpc>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, vpc) => (
        <ListNameCell
          name={
            <Link to="/networks/vpcs/$vpcId" params={{ vpcId: vpc.id }}>
              {vpc.name}
            </Link>
          }
          id={vpc.id}
        />
      ),
    },
    {
      key: "state",
      title: "状态",
      width: 120,
      render: (_, vpc) => <StatusTag status={vpc.state} />,
    },
    { key: "cidr", title: "CIDR", render: (_, vpc) => vpc.cidr },
    {
      key: "subnets",
      title: "子网数",
      render: (_, vpc) =>
        subnets.isError ? "—" : (subnetCounts.get(vpc.id) ?? 0),
    },
    {
      key: "routeTable",
      title: "路由表",
      render: (_, vpc) =>
        routes.isError ? "—" : routeTableNames.get(vpc.id)?.join("、") || "—",
    },
    {
      key: "createdAt",
      title: "创建时间",
      render: (_, vpc) => formatDateTime(vpc.created_at),
    },
  ];

  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-VPCwangluo"
            title="VPC"
            subtitle="创建和管理相互隔离的虚拟私有云网络"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setCreateVisible(true)}
              >
                创建 VPC
              </ToolbarButton>
            }
          />
        }
        tabs={
          <StatusTabs
            value={status}
            onChange={setStatus}
            items={[
              { value: "all", label: "全部", count: statusCounts.all },
              {
                value: "available",
                label: "可用",
                count: statusCounts.available,
              },
              {
                value: "pending",
                label: "创建中",
                count: statusCounts.pending,
              },
              { value: "failed", label: "异常", count: statusCounts.failed },
            ]}
          />
        }
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSearch
                fields={[
                  { value: "name", label: "名称" },
                  { value: "id", label: "ID" },
                ]}
                field={searchField}
                value={searchText}
                onFieldChange={setSearchField}
                onChange={setSearchText}
              />
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={vpcs.isFetching}
                onClick={() => {
                  refresh();
                  void Promise.all([subnets.refetch(), routes.refetch()]);
                }}
              />
            }
          />
        }
      >
        <ListDataTable
          data={items}
          columns={[
            ...columns,
            {
              key: "__actions",
              title: "操作",
              fixed: "right",
              render: (_value, vpc) => (
                <ListRowActions>
                  <ListRowActionButton
                    status="danger"
                    onClick={() =>
                      Modal.confirm({
                        title: "删除 VPC",
                        content: `确定删除「${vpc.name}」？存在子网或关联资源时无法删除，请先清理相关资源。`,
                        okButtonProps: { status: "danger" },
                        onOk: () => deleteVpc.mutateAsync(vpc),
                      })
                    }
                  >
                    删除
                  </ListRowActionButton>
                </ListRowActions>
              ),
            },
          ]}
          loading={vpcs.isFetching}
          emptyIconClassName="icon-VPCwangluo"
          emptyText={
            searchText || status !== "all"
              ? "没有符合条件的 VPC"
              : "还没有 VPC，点击「创建 VPC」开始"
          }
          tableLabel="VPC 列表"
          preserveTableOnEmpty
          pagination={{
            page,
            pageSize,
            total: paginationTotal,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </ListPageFrame>
      <Modal
        visible={createVisible}
        title="创建 VPC"
        onCancel={() => setCreateVisible(false)}
        onOk={() => createVpc.mutateAsync(undefined)}
        confirmLoading={createVpc.isPending}
        unmountOnExit
      >
        <Form layout="vertical">
          <Form.Item label="名称" required>
            <Input
              value={name}
              onChange={setName}
              placeholder="请输入 VPC 名称"
              maxLength={64}
              showWordLimit
            />
          </Form.Item>
          <Form.Item
            label="IPv4 CIDR"
            required
            validateStatus={cidrError ? "error" : undefined}
            help={cidrError}
          >
            <Ipv4CidrInput
              value={cidr}
              onChange={setCidr}
              placeholder="10.0.0.0"
              withPrefix
            />
          </Form.Item>
          <Typography.Text type="secondary">
            CIDR 不能与租户下已有 VPC 网段重叠；创建后不可修改。
          </Typography.Text>
        </Form>
      </Modal>
    </>
  );
}
