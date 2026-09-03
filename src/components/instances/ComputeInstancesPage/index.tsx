import { Link } from "@tanstack/react-router";
import { Empty } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { PageHeader } from "@/components/shell/AppShell";
import {
  DataTable,
  ListDataTable,
  ListPageFrame,
  ListPageHeader,
  DataTableNameCell,
  ListToolbar,
  StatusTabs,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
  StatusTag,
} from "@/components/common";
import { formatDateTime } from "@/lib/format";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import {
  getInstanceDisplayIp,
  getInstanceNetworkValue,
} from "@/lib/instance-network";
import type { components } from "@/api/core-schema";

type Instance = components["schemas"]["InstanceRecord"];
type CreateInstanceRequest = components["schemas"]["CreateInstanceRequest"];
type InstanceKind = CreateInstanceRequest["kind"];
type InstanceStatusFilter =
  "all" | "running" | "stopped" | "deploying" | "failed";
type InstanceSearchField = "name" | "id";

type InstancesListPageProps = {
  kindFilter?: InstanceKind;
  title?: string;
  subtitle?: string;
};

export function InstancesListPage(props: InstancesListPageProps = {}) {
  const {
    kindFilter,
    title = "实例",
    subtitle = "VM / 容器 / GPU 容器 / Sandbox",
  } = props;
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<InstanceStatusFilter>("all");
  const [searchField, setSearchField] = useState<InstanceSearchField>("name");
  const [searchText, setSearchText] = useState("");

  const {
    query: instances,
    page,
    pageSize,
    setPage,
    setPageSize,
    refresh,
  } = useCursorPaginatedQuery<Instance>({
    queryKey: [
      "instances",
      kindFilter ?? "all",
      { statusFilter, searchField, searchText },
    ],
    cursorScope: `${kindFilter ?? `all`}:${statusFilter}:${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      const keyword = searchText.trim();
      const listQuery = asUncontractedQuery({
        limit,
        cursor,
        kind: kindFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        search_field: keyword ? searchField : undefined,
        keyword: keyword || undefined,
      });
      const { data, error } = await coreApi.GET("/instances", {
        params: { query: listQuery },
      });
      if (error || !data) throw error ?? new Error("实例列表未返回结果");
      return data;
    },
  });
  const { data, isFetching, error } = instances;
  useListErrorNotification({
    id: `instances-list:${kindFilter ?? `all`}`,
    title: `${title}列表加载失败`,
    error,
  });

  const items = (data?.items ?? []) as Instance[];
  const prototypeTable =
    kindFilter === "vm" ||
    kindFilter === "gpu_container" ||
    kindFilter === "sandbox";
  const statusTabs = [
    { value: "all" as const, label: "全部", count: items.length },
    {
      value: "running" as const,
      label: "运行中",
      count: items.filter((item) => item.state === "running").length,
    },
    {
      value: "stopped" as const,
      label: "已停止",
      count: items.filter((item) => item.state === "stopped").length,
    },
    {
      value: "deploying" as const,
      label: "部署中",
      count: items.filter(
        (item) =>
          item.state === "pending" ||
          item.state === "provisioning" ||
          item.state === "starting",
      ).length,
    },
    {
      value: "failed" as const,
      label: "异常",
      count: items.filter((item) => item.state === "failed").length,
    },
  ];
  const prototypeColumns: Array<ListColumn<Instance>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, row) => (
        <DataTableNameCell
          name={
            <Link
              to={
                kindFilter === "sandbox"
                  ? "/sandbox-instances/$instanceId"
                  : kindFilter === "vm"
                    ? "/vm-instances/$instanceId"
                    : "/compute-instances/$instanceId"
              }
              params={{ instanceId: row.id }}
            >
              {row.name ?? row.id}
            </Link>
          }
          id={row.id}
        />
      ),
    },
    { key: "kind", title: "类型", render: (_, row) => row.kind },
    {
      key: "vpc",
      title: "VPC",
      render: (_, row) => getInstanceNetworkValue(row, "vpc_id"),
    },
    {
      key: "subnet",
      title: "子网",
      render: (_, row) => getInstanceNetworkValue(row, "subnet_id"),
    },
    {
      key: "ip",
      title: "IP",
      render: (_, row) => getInstanceDisplayIp(row),
    },
    {
      key: "state",
      title: "状态",
      width: 120,
      render: (_, row) => <StatusTag status={row.state} />,
    },
    {
      key: "createdAt",
      title: "创建时间",
      render: (_, row) => formatDateTime(row.created_at),
    },
  ];
  const paginationTotal = data?.total ?? items.length;
  const prototypeDataTable = (
    <ListDataTable
      data={items}
      columns={prototypeColumns}
      rowSelection={{
        selectedRowKeys: selectedKeys,
        onChange: (keys) => setSelectedKeys(keys.map(String)),
      }}
      loading={isFetching}
      emptyIconClassName={
        kindFilter === "sandbox"
          ? "icon-Sandbox"
          : kindFilter === "vm"
            ? "icon-yunzhuji"
            : "icon-GPU"
      }
      emptyText="暂无实例，点击右上角创建"
      tableLabel={`${title}列表`}
      preserveTableOnEmpty={kindFilter === "sandbox"}
      pagination={{
        page,
        pageSize,
        total: paginationTotal,
        onPageChange: setPage,
        onPageSizeChange: (nextPageSize) => {
          setPageSize(nextPageSize);
          setSelectedKeys([]);
        },
      }}
    />
  );

  useEffect(() => {
    setPage(1);
    setSelectedKeys([]);
  }, [searchField, searchText, setPage, statusFilter]);

  if (prototypeTable) {
    return (
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName={
              kindFilter === "sandbox"
                ? "icon-Sandbox"
                : kindFilter === "vm"
                  ? "icon-yunzhuji"
                  : "icon-GPUrongqishili"
            }
            title={title}
            subtitle={subtitle}
          />
        }
        tabs={
          <StatusTabs
            items={statusTabs}
            value={statusFilter}
            onChange={setStatusFilter}
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
                spinning={isFetching}
                onClick={refresh}
              />
            }
          />
        }
      >
        {prototypeDataTable}
      </ListPageFrame>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle={subtitle} />
      <DataTable<Instance>
        columns={[
          {
            title: "名称",
            render: (_, r) => (
              <Link
                to={
                  kindFilter === "container"
                    ? "/container-instances/$instanceId"
                    : kindFilter === "vm"
                      ? "/vm-instances/$instanceId"
                      : kindFilter === "sandbox"
                        ? "/sandbox-instances/$instanceId"
                        : "/compute-instances/$instanceId"
                }
                params={{ instanceId: r.id }}
                className="text-inherit"
              >
                {r.name ?? r.id}
              </Link>
            ),
          },
          { title: "类型", dataIndex: "kind" },
          {
            title: "VPC",
            render: (_, r) => getInstanceNetworkValue(r, "vpc_id"),
          },
          {
            title: "子网",
            render: (_, r) => getInstanceNetworkValue(r, "subnet_id"),
          },
          { title: "IP", render: (_, r) => getInstanceDisplayIp(r) },
          {
            title: "状态",
            width: 120,
            render: (_, r) => <StatusTag status={r.state} />,
          },
          { title: "创建时间", render: (_, r) => formatDateTime(r.created_at) },
        ]}
        data={items}
        loading={isFetching}
        pagination={false}
        noDataElement={<Empty description="暂无实例，点击右上角创建" />}
      />
    </div>
  );
}
