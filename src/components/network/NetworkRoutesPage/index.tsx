import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal, Select } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import {
  deleteNetworkRoute,
  listNetworkRoutes,
  listNetworkVpcs,
  type NetworkRoute,
  type NetworkVPC,
} from "@/api/network";

import { CreateRouteModal } from "@/components/network/CreateRouteModal";
import {
  DataTableNameCell,
  ListPageFrame,
  type ListColumn,
  ListDataTable,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";

type Vpc = NetworkVPC;
type SearchField = "description" | "id";
type StatusFilter = "all" | "available";

export function NetworkRoutesPage() {
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
    errorNotification: {
      id: "routes",
      action: "路由列表加载",
      fallback: "请求失败，请稍后重试",
    },
    queryKey: ["network-routes", { status, searchField, searchText, filterVpcId }],
    cursorScope: `${status}:${searchField}:${searchText.trim()}:${filterVpcId}`,
    fetchPage: async ({ cursor, limit }) => {
      const keyword = searchText.trim();
      return listNetworkRoutes({
        limit,
        cursor,
        vpc_id: filterVpcId || undefined,
        status: status === "all" ? undefined : status,
        search_field: keyword ? searchField : undefined,
        keyword: keyword || undefined,
      });
    },
  });
  const vpcs = useQuery({
    meta: {
      errorNotification: {
        id: "vpcs",
        action: "VPC 列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-vpcs", "route-list"],
    queryFn: () => listNetworkVpcs({ limit: 100 }),
  });
  const deleteRoute = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "route-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (item: NetworkRoute) => deleteNetworkRoute(item.id),
    onSuccess: () => {
      resetPagination();
      qc.invalidateQueries({ queryKey: ["network-routes"] });
    },
  });

  const items = (routes.data?.items ?? []) as NetworkRoute[];
  const vpcNames = useMemo(
    () => new Map(((vpcs.data?.items ?? []) as Vpc[]).map((vpc) => [vpc.id, vpc.name])),
    [vpcs.data?.items],
  );
  const paginationTotal = routes.data?.total ?? items.length;
  const columns: Array<ListColumn<NetworkRoute>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link to="/routes/$routeId" params={{ routeId: item.id }}>
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
        <Link to="/vpcs/$vpcId" params={{ vpcId: item.vpc_id }}>
          {vpcNames.get(item.vpc_id) ?? item.vpc_id}
        </Link>
      ),
    },
    {
      key: "destination",
      title: "目标网段",
      dataIndex: "destination_cidr",
    },
    {
      key: "nextHop",
      title: "下一跳",
      dataIndex: "next_hop_id",
    },
    {
      key: "nextHopType",
      title: "类型",
      render: (_, item) =>
        item.next_hop_type === "instance" ? "实例" : item.next_hop_type === "nat" ? "NAT" : "网关",
    },
    { key: "priority", title: "下一跳优先级", render: () => "-" },
  ];

  return (
    <>
      <ListPageFrame
        header={{
          iconClassName: "icon-VPCluyouqi",
          title: "路由",
          subtitle: "管理 VPC 的自定义流量转发规则",
          actions: [
            {
              key: "header-action-1",
              label: "创建路由",
              iconClassName: "icon-add-1",
              variant: "primary",
              onClick: () => setCreateVisible(true),
            },
          ],
        }}
        tabs={{
          value: status,
          onChange: setStatus,
          items: [
            {
              value: "all",
              label: "全部",
            },
            {
              value: "available",
              label: "可用",
            },
          ],
        }}
        toolbar={{
          search: {
            fields: [
              {
                value: "description",
                label: "名称",
              },
              {
                value: "id",
                label: "ID",
              },
            ],
            field: searchField,
            value: searchText,
            onFieldChange: setSearchField,
            onChange: setSearchText,
          },
          filters: (
            <div className="flex flex-wrap gap-3">
              <Select
                aria-label="按 VPC 筛选"
                value={filterVpcId || undefined}
                onChange={setFilterVpcId}
                allowClear
                placeholder="全部 VPC"
                loading={vpcs.isLoading}
                style={{
                  width: 220,
                }}
              >
                {((vpcs.data?.items ?? []) as Vpc[]).map((vpc) => (
                  <Select.Option key={vpc.id} value={vpc.id}>
                    {vpc.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
          ),
          refresh: {
            label: "刷新",
            spinning: routes.isFetching || vpcs.isFetching,
            onClick: () => {
              refresh();
              void vpcs.refetch();
            },
          },
        }}
      >
        <ListDataTable
          data={items}
          columns={columns}
          rowActions={[
            {
              key: "delete",
              label: "删除",
              intent: "danger",
              loading: (item) => deleteRoute.isPending && deleteRoute.variables?.id === item.id,
              onClick: (item) =>
                void Modal.confirm({
                  title: "删除路由",
                  content: `确定删除「${item.description?.trim() || item.destination_cidr}」？删除后该转发规则将立即失效。`,
                  okButtonProps: { status: "danger" },
                  onOk: () => deleteRoute.mutateAsync(item),
                }),
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
      <CreateRouteModal visible={createVisible} onCancel={() => setCreateVisible(false)} />
    </>
  );
}
