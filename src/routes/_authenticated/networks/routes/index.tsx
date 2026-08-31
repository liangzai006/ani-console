import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal, Select } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { CreateRouteModal } from "@/components/network/CreateRouteModal";
import {
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
} from "@/components/common";
import { listOrThrow } from "@/lib/api-list";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";

type NetworkRoute = components["schemas"]["NetworkRoute"];
type Vpc = components["schemas"]["NetworkVPC"];
type SearchField = "description" | "id";
type StatusFilter = "all" | "available";

export const Route = createFileRoute("/_authenticated/networks/routes/")({
  component: NetworkRoutesPage,
});

function NetworkRoutesPage() {
  const qc = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const [searchField, setSearchField] = useState<SearchField>("description");
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [filterVpcId, setFilterVpcId] = useState("");
  const {
    query: routes,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  } = useCursorPaginatedQuery<NetworkRoute>({
    queryKey: ["network-routes"],
    cursorScope: `${status}:${searchField}:${searchText.trim()}:${filterVpcId}`,
    fetchPage: async ({ cursor, limit }) => {
      const { data, error } = await coreApi.GET("/networks/routes", {
        params: {
          query: { limit, cursor, vpc_id: filterVpcId || undefined },
        },
      });
      if (error || !data) throw error ?? new Error("路由列表未返回结果");
      return data;
    },
  });
  const vpcs = useQuery({
    queryKey: ["network-vpcs", "route-list"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/vpcs", { params: { query: { limit: 100 } } }),
      ),
  });
  const deleteRoute = useMutation({
    mutationFn: async (item: NetworkRoute) => {
      const { error } = await coreApi.DELETE("/networks/routes/{route_id}", {
        params: { path: { route_id: item.id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      resetPagination();
      qc.invalidateQueries({ queryKey: ["network-routes"] });
    },
    onError: (error) => showApiError(error),
  });

  const items = (routes.data?.items ?? []) as NetworkRoute[];
  const vpcNames = useMemo(
    () =>
      new Map(
        ((vpcs.data?.items ?? []) as Vpc[]).map((vpc) => [vpc.id, vpc.name]),
      ),
    [vpcs.data?.items],
  );
  const statusCounts = useMemo(
    () => ({ all: items.length, available: items.length }),
    [items.length],
  );
  // TODO: /networks/routes 暂不支持关键字查询，接口补齐后传递 searchField/searchText。
  const paginationTotal = routes.data?.total ?? items.length;
  useListErrorNotification({
    id: "network-routes-list",
    title: "路由列表加载失败",
    error: routes.error,
  });
  const columns: Array<ListColumn<NetworkRoute>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <ListNameCell
          name={
            <Link to="/networks/routes/$routeId" params={{ routeId: item.id }}>
              {item.description?.trim() || item.destination_cidr}
            </Link>
          }
          id={item.id}
        />
      ),
    },
    {
      key: "vpc",
      title: "VPC",
      render: (_, item) => (
        <Link to="/networks/vpcs/$vpcId" params={{ vpcId: item.vpc_id }}>
          {vpcNames.get(item.vpc_id) ?? item.vpc_id}
        </Link>
      ),
    },
    {
      key: "destination",
      title: "目标网段",
      render: (_, item) => item.destination_cidr,
    },
    {
      key: "nextHop",
      title: "下一跳",
      render: (_, item) => item.next_hop_id,
    },
    {
      key: "nextHopType",
      title: "类型",
      render: (_, item) =>
        item.next_hop_type === "instance"
          ? "实例"
          : item.next_hop_type === "nat"
            ? "NAT"
            : "网关",
    },
    { key: "priority", title: "下一跳优先级", render: () => "—" },
  ];

  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-VPCluyouqi"
            title="路由"
            subtitle="管理 VPC 的自定义流量转发规则"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setCreateVisible(true)}
              >
                创建路由
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
            ]}
          />
        }
        toolbar={
          <ListToolbar
            filters={
              <div className="flex flex-wrap gap-3">
                <ToolbarSearch
                  fields={[
                    { value: "description", label: "名称" },
                    { value: "id", label: "ID" },
                  ]}
                  field={searchField}
                  value={searchText}
                  onFieldChange={setSearchField}
                  onChange={setSearchText}
                />
                <Select
                  aria-label="按 VPC 筛选"
                  value={filterVpcId || undefined}
                  onChange={setFilterVpcId}
                  allowClear
                  placeholder="全部 VPC"
                  loading={vpcs.isLoading}
                  style={{ width: 220 }}
                >
                  {((vpcs.data?.items ?? []) as Vpc[]).map((vpc) => (
                    <Select.Option key={vpc.id} value={vpc.id}>
                      {vpc.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={routes.isFetching || vpcs.isFetching}
                onClick={() => {
                  refresh();
                  void vpcs.refetch();
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
              render: (_value, item) => (
                <ListRowActions>
                  <ListRowActionButton
                    status="danger"
                    onClick={() =>
                      Modal.confirm({
                        title: "删除路由",
                        content: `确定删除「${item.description?.trim() || item.destination_cidr}」？删除后该转发规则将立即失效。`,
                        okButtonProps: { status: "danger" },
                        onOk: () => deleteRoute.mutateAsync(item),
                      })
                    }
                  >
                    删除
                  </ListRowActionButton>
                </ListRowActions>
              ),
            },
          ]}
          loading={routes.isFetching || vpcs.isFetching}
          emptyIconClassName="icon-VPCluyouqi"
          emptyText={
            searchText || filterVpcId
              ? "没有符合条件的路由"
              : "还没有自定义路由，点击「创建路由」开始"
          }
          tableLabel="路由列表"
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
      <CreateRouteModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
      />
    </>
  );
}
