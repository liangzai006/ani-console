import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dropdown, Menu, Modal, Select } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import {
  deleteNetworkLoadBalancer,
  listNetworkLoadBalancers,
  listNetworkVpcs,
  type NetworkLoadBalancer,
  type NetworkVPC,
} from "@/api/network";

import { CreateLoadBalancerModal } from "@/components/network/CreateLoadBalancerModal";
import {
  DataTableNameCell,
  ListPageFrame,
  DataTableRowActionButton,
  DataTableRowActions,
  type ListColumn,
  StatusTag,
  ListDataTable,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { formatDateTime } from "@/lib/format";

type LoadBalancer = NetworkLoadBalancer;
type Vpc = NetworkVPC;
type StatusFilter = "all" | "running" | "error";
type SearchField = "name" | "id";

export function LoadBalancersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [vpcId, setVpcId] = useState("");
  const {
    query: loadBalancers,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  } = useCursorPaginatedQuery<LoadBalancer>({
    errorNotification: {
      id: "load-balancers",
      action: "负载均衡列表加载",
      fallback: "请求失败，请稍后重试",
    },
    queryKey: ["network-load-balancers", { status, searchField, searchText, vpcId }],
    cursorScope: `${status}:${searchField}:${searchText.trim()}:${vpcId}`,
    fetchPage: async ({ cursor, limit }) => {
      const keyword = searchText.trim();
      return listNetworkLoadBalancers({
        limit,
        cursor,
        vpc_id: vpcId || undefined,
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
    queryKey: ["network-vpcs", "load-balancer-list"],
    queryFn: () => listNetworkVpcs({ limit: 100 }),
  });
  const deleteLoadBalancer = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "load-balancer-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (item: LoadBalancer) => deleteNetworkLoadBalancer(item.id),
    onSuccess: () => {
      resetPagination();
      qc.invalidateQueries({ queryKey: ["network-load-balancers"] });
    },
  });
  const items = useMemo(
    () => (loadBalancers.data?.items ?? []) as LoadBalancer[],
    [loadBalancers.data?.items],
  );
  const paginationTotal = loadBalancers.data?.total ?? items.length;
  const columns: Array<ListColumn<LoadBalancer>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link to="/load-balancers/$loadBalancerId" params={{ loadBalancerId: item.id }}>
              {item.name}
            </Link>
          }
          id={item.id}
        />
      ),
    },
    {
      key: "state",
      title: "状态",
      width: 120,
      render: (_, item) => <StatusTag status={item.state} />,
    },
    {
      key: "vip",
      title: "VIP",
      dataIndex: "vip",
      placeholder: "-",
    },
    {
      key: "listeners",
      title: "监听器",
      dataIndex: "listeners.length",
    },
    { key: "backends", title: "后端数", render: () => "-" },
    {
      key: "createdAt",
      title: "创建时间",
      render: (_, item) => formatDateTime(item.created_at),
    },
  ];
  return (
    <>
      <ListPageFrame
        header={{
          iconClassName: "icon-fuzaijunhengqi",
          title: "负载均衡",
          subtitle: "通过 VIP、监听器和后端组对外提供高可用服务",
          actions: [
            {
              key: "header-action-1",
              label: "创建负载均衡",
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
              value: "running",
              label: "运行中",
            },
            {
              value: "error",
              label: "异常",
            },
          ],
        }}
        toolbar={{
          search: {
            fields: [
              {
                value: "name",
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
                value={vpcId || undefined}
                onChange={setVpcId}
                allowClear
                placeholder="全部 VPC"
                loading={vpcs.isLoading}
                style={{
                  width: 220,
                }}
              >
                {((vpcs.data?.items ?? []) as Vpc[]).map((item) => (
                  <Select.Option key={item.id} value={item.id}>
                    {item.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
          ),
          refresh: {
            label: "刷新",
            spinning: loadBalancers.isFetching || vpcs.isFetching,
            onClick: () => {
              refresh();
              void vpcs.refetch();
            },
          },
        }}
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
                <DataTableRowActions>
                  <Dropdown
                    droplist={
                      <Menu>
                        <Menu.Item
                          key="listeners"
                          onClick={() =>
                            navigate({
                              to: "/load-balancers/$loadBalancerId",
                              params: {
                                loadBalancerId: item.id,
                              },
                            })
                          }
                        >
                          配置监听
                        </Menu.Item>
                        <Menu.Item
                          key="backends"
                          onClick={() =>
                            navigate({
                              to: "/load-balancers/$loadBalancerId",
                              params: {
                                loadBalancerId: item.id,
                              },
                            })
                          }
                        >
                          绑定后端
                        </Menu.Item>
                        <Menu.Item
                          key="delete"
                          onClick={() =>
                            Modal.confirm({
                              title: "删除负载均衡",
                              content: `确定删除「${item.name}」？`,
                              okButtonProps: {
                                status: "danger",
                              },
                              onOk: () => deleteLoadBalancer.mutateAsync(item),
                            })
                          }
                        >
                          删除
                        </Menu.Item>
                      </Menu>
                    }
                    trigger="click"
                  >
                    <DataTableRowActionButton>更多</DataTableRowActionButton>
                  </Dropdown>
                </DataTableRowActions>
              ),
            },
          ]}
          loading={loadBalancers.isFetching || vpcs.isFetching}
          emptyIconClassName="icon-fuzaijunhengqi"
          emptyText={
            searchText || vpcId || status !== "all"
              ? "没有符合条件的负载均衡"
              : "还没有负载均衡，点击「创建负载均衡」开始"
          }
          tableLabel="负载均衡列表"
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
      <CreateLoadBalancerModal visible={createVisible} onCancel={() => setCreateVisible(false)} />
    </>
  );
}
