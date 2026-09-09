import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ListDataTable,
  ListPageFrame,
  ListPageHeader,
  DataTableNameCell,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
  StatusTag,
} from "@/components/common";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatDateTime } from "@/lib/format";
import { getImageDisplayName } from "@/lib/render";
import { ContainerInstanceActions } from "@/components/instances/ContainerInstanceActions";
import { ContainerInstanceCreateModal } from "@/components/instances/ContainerInstanceCreateModal";
import { containerInstanceDataSource } from "./data-source";
import type {
  ContainerInstance,
  ContainerInstanceDataSource,
  ContainerInstanceSearchField,
  ContainerInstanceStatusFilter,
} from "./types";

const COLUMN_LABELS = {
  name: "名称",
  kind: "类型",
  status: "状态",
  image: "镜像",
  cpuMemory: "规格",
  replicas: "副本",
  rolloutStatus: "发布",
  node: "节点",
  endpoint: "访问地址",
  createdAt: "创建时间",
};

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

export function ContainerInstancesPage({
  dataSource = containerInstanceDataSource,
}: {
  dataSource?: ContainerInstanceDataSource;
}) {
  const [status, setStatus] = useState<ContainerInstanceStatusFilter>("all");
  const [searchField, setSearchField] = useState<ContainerInstanceSearchField>("name");
  const [searchText, setSearchText] = useState("");
  const keyword = useDebouncedValue(searchText, 200);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createVisible, setCreateVisible] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [keyword, searchField, status]);

  const query = useQuery({
    queryKey: ["container-instances", { status, searchField, keyword, page, pageSize }],
    queryFn: () => dataSource.list({ status, searchField, keyword, page, pageSize }),
    placeholderData: (previous) => previous,
  });

  useListErrorNotification({
    id: "container-instances-list-error",
    title: "容器实例加载失败",
    error: query.error,
  });

  const result = query.data ?? {
    items: [],
    total: 0,
    hasTransitioningInstances: false,
  };
  const allColumns: Array<ListColumn<ContainerInstance>> = [
    {
      key: "name",
      title: COLUMN_LABELS.name,
      render: (_, row) => (
        <DataTableNameCell
          name={
            <Link to="/container-instances/$instanceId" params={{ instanceId: row.id }}>
              {row.name}
            </Link>
          }
          id={row.id}
        />
      ),
    },
    {
      key: "status",
      title: COLUMN_LABELS.status,
      width: 120,
      render: (_, row) => <StatusTag status={row.status} />,
    },
    {
      key: "image",
      title: COLUMN_LABELS.image,
      width: 220,
      ellipsis: true,
      render: (_, row) => getImageDisplayName(row.record.image),
    },
    {
      key: "cpuMemory",
      title: COLUMN_LABELS.cpuMemory,
      dataIndex: "cpuMemory",
    },
    {
      key: "replicas",
      title: COLUMN_LABELS.replicas,
      dataIndex: "replicas",
    },
    {
      key: "rolloutStatus",
      title: COLUMN_LABELS.rolloutStatus,
      width: 120,
      render: (_, row) => <StatusTag status={row.rolloutStatus} />,
    },
    {
      key: "node",
      title: COLUMN_LABELS.node,
      dataIndex: "node",
    },
    {
      key: "endpoint",
      title: COLUMN_LABELS.endpoint,
      dataIndex: "endpoint",
    },
    {
      key: "createdAt",
      title: COLUMN_LABELS.createdAt,
      render: (_, row) => formatDateTime(row.createdAt),
    },
  ];

  const statusTabs = [
    { value: "all" as const, label: "全部" },
    { value: "running" as const, label: "运行中" },
    { value: "stopped" as const, label: "已停止" },
    { value: "deploying" as const, label: "部署中" },
    { value: "failed" as const, label: "异常" },
  ];
  return (
    <ListPageFrame
      header={
        <ListPageHeader
          iconClassName="icon-rongqishili"
          title="容器实例"
          subtitle="当前租户权限范围内的资源与操作"
          extra={
            <ToolbarButton
              variant="primary"
              iconClassName="icon-add-1"
              onClick={() => setCreateVisible(true)}
            >
              创建容器实例
            </ToolbarButton>
          }
        />
      }
      tabs={<StatusTabs items={statusTabs} value={status} onChange={setStatus} />}
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
            <>
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={query.isFetching}
                onClick={() => void query.refetch()}
              />
            </>
          }
        />
      }
    >
      <ListDataTable
        data={result.items}
        columns={[
          ...allColumns,
          {
            key: "__actions",
            title: "操作",
            fixed: "right",
            render: (_value, row) => (
              <ContainerInstanceActions
                instance={row.record}
                onChanged={() => void query.refetch()}
              />
            ),
          },
        ]}
        loading={query.isFetching}
        emptyIconClassName="icon-rongqishili"
        emptyText={
          status === "all" && !keyword
            ? "还没有容器实例，点击「创建容器实例」开始"
            : "后端未返回符合当前条件的容器实例"
        }
        tableLabel="容器实例列表"
        preserveTableOnEmpty
        pagination={{
          page,
          pageSize,
          total: result.total,
          onPageChange: (nextPage) => {
            setPage(nextPage);
          },
          onPageSizeChange: (nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          },
        }}
      />
      <ContainerInstanceCreateModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
        onCreated={() => setCreateVisible(false)}
      />
    </ListPageFrame>
  );
}
