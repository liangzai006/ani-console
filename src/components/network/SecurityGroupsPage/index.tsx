import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal, Select } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { CreateSecurityGroupModal } from "@/components/network/CreateSecurityGroupModal";
import {
  ListDataTable,
  DataTableNameCell,
  ListPageFrame,
  ListPageHeader,
  DataTableRowActionButton,
  DataTableRowActions,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/common";
import { listOrThrow } from "@/lib/api-list";
import { formatDateTime } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";

type SecurityGroup = components["schemas"]["NetworkSecurityGroup"];
type Vpc = components["schemas"]["NetworkVPC"];
type StatusFilter = "all" | "available";
type SearchField = "name" | "id";

export function SecurityGroupsPage() {
  const [createVisible, setCreateVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [filterVpcId, setFilterVpcId] = useState("");
  const {
    query: securityGroups,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  } = useCursorPaginatedQuery<SecurityGroup>({
    queryKey: [
      "network-security-groups",
      { status, searchField, searchText, filterVpcId },
    ],
    cursorScope: `${status}:${searchField}:${searchText.trim()}:${filterVpcId}`,
    fetchPage: async ({ cursor, limit }) => {
      const keyword = searchText.trim();
      const { data, error } = await coreApi.GET("/networks/security-groups", {
        params: { query: asUncontractedQuery({
          limit,
          cursor,
          vpc_id: filterVpcId || undefined,
          status: status === "all" ? undefined : status,
          search_field: keyword ? searchField : undefined,
          keyword: keyword || undefined,
        }) },
      });
      if (error || !data) throw error ?? new Error("安全组列表未返回结果");
      return data;
    },
  });
  const vpcs = useQuery({
    queryKey: ["network-vpcs", "security-group-create"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/vpcs", { params: { query: { limit: 100 } } }),
      ),
  });

  const qc = useQueryClient();
  const deleteSecurityGroup = useMutation({
    mutationFn: async (item: SecurityGroup) => {
      const { error } = await coreApi.DELETE(
        "/networks/security-groups/{security_group_id}",
        {
          params: { path: { security_group_id: item.id } },
        },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      resetPagination();
      qc.invalidateQueries({ queryKey: ["network-security-groups"] });
    },
    onError: (error) => showApiError(error),
  });
  const copySecurityGroup = useMutation({
    mutationFn: async (item: SecurityGroup) => {
      const { error } = await coreApi.POST("/networks/security-groups", {
        body: {
          name: `${item.name}-copy`,
          vpc_id: item.vpc_id,
          description: item.description,
          rules: item.rules,
          idempotency_key: newIdempotencyKey(),
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      resetPagination();
      qc.invalidateQueries({ queryKey: ["network-security-groups"] });
    },
    onError: (error) => showApiError(error),
  });

  const items = useMemo(
    () => (securityGroups.data?.items ?? []) as SecurityGroup[],
    [securityGroups.data?.items],
  );
  const vpcNames = useMemo(
    () =>
      new Map(
        ((vpcs.data?.items ?? []) as Vpc[]).map((vpc) => [vpc.id, vpc.name]),
      ),
    [vpcs.data?.items],
  );
  const statusCounts = useMemo(
    () => ({
      all: items.length,
      available: items.filter((item) => item.state === "available").length,
    }),
    [items],
  );
  const paginationTotal = securityGroups.data?.total ?? items.length;
  useListErrorNotification({
    id: "security-groups-list",
    title: "安全组列表加载失败",
    error: securityGroups.error,
  });

  const columns: Array<ListColumn<SecurityGroup>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link
              to="/security-groups/$securityGroupId"
              params={{ securityGroupId: item.id }}
            >
              {item.name}
            </Link>
          }
          id={item.id}
        />
      ),
    },
    {
      key: "vpc",
      title: "VPC",
      render: (_, item) =>
        item.vpc_id ? (
          <Link to="/vpcs/$vpcId" params={{ vpcId: item.vpc_id }}>
            {vpcNames.get(item.vpc_id) ?? item.vpc_id}
          </Link>
        ) : (
          "-"
        ),
    },
    {
      key: "rules",
      title: "规则数",
      render: (_, item) => item.rule_count ?? item.rules.length,
    },
    {
      key: "instances",
      title: "关联实例",
      render: (_, item) => item.bound_instance_count ?? 0,
    },
    {
      key: "createdAt",
      title: "创建时间",
      render: (_, item) => formatDateTime(item.created_at),
    },
  ];

  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-anquanzu"
            title="安全组"
            subtitle="通过入方向和出方向规则控制实例网络访问"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setCreateVisible(true)}
              >
                创建安全组
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
                    { value: "name", label: "名称" },
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
                spinning={securityGroups.isFetching || vpcs.isFetching}
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
                <DataTableRowActions>
                  <DataTableRowActionButton
                    loading={copySecurityGroup.isPending}
                    onClick={() => copySecurityGroup.mutate(item)}
                  >
                    复制
                  </DataTableRowActionButton>
                  <DataTableRowActionButton
                    status="danger"
                    onClick={() =>
                      Modal.confirm({
                        title: "删除安全组",
                        content: `确定删除「${item.name}」？安全组被实例使用时无法删除，请先解除关联。`,
                        okButtonProps: { status: "danger" },
                        onOk: () => deleteSecurityGroup.mutateAsync(item),
                      })
                    }
                  >
                    删除
                  </DataTableRowActionButton>
                </DataTableRowActions>
              ),
            },
          ]}
          loading={securityGroups.isFetching || vpcs.isFetching}
          emptyIconClassName="icon-anquanzu"
          emptyText={
            searchText || filterVpcId || status !== "all"
              ? "没有符合条件的安全组"
              : "还没有安全组，点击「创建安全组」开始"
          }
          tableLabel="安全组列表"
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
      <CreateSecurityGroupModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
      />
    </>
  );
}
