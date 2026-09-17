import { listInstances, type InstanceRecord } from "@/api/instances";
import { Link } from "@tanstack/react-router";
import { Tooltip } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { GpuContainerCreateModal } from "@/components/instances/GpuContainerCreateModal";
import {
  DataTableNameCell,
  ListPageFrame,
  type ListColumn,
  StatusTag,
  ListDataTable,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { formatDateTime } from "@/lib/format";
import { getImageDisplayName } from "@/lib/render";
import { useGpuInstanceRowActions } from "./GpuInstanceRowActions";

type Instance = InstanceRecord;
type StatusFilter = "all" | "running" | "stopped" | "queued" | "failed";
type SearchField = "name" | "id";

export function GpuInstancesPage() {
  const [createVisible, setCreateVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const keyword = searchText.trim();
  const { query, page, pageSize, setPage, setPageSize, refresh } =
    useCursorPaginatedQuery<Instance>({
      errorNotification: {
        id: "gpu-containers",
        action: "GPU 容器实例列表加载",
        fallback: "请求失败，请稍后重试",
      },
      queryKey: ["instances", "gpu_container", { status, searchField, keyword }],
      cursorScope: `gpu:${status}:${searchField}:${keyword}`,
      fetchPage: async ({ cursor, limit }) => {
        const listQuery = {
          limit,
          cursor,
          kind: "gpu_container",
          status: status === "all" ? undefined : status,
          search_field: keyword ? searchField : undefined,
          keyword: keyword || undefined,
        };
        return listInstances(listQuery);
      },
    });
  useEffect(() => {
    setPage(1);
  }, [keyword, searchField, status, setPage]);
  const { dialogNode, rowActions } = useGpuInstanceRowActions(refresh);

  const allItems = (query.data?.items ?? []) as Instance[];
  const items = allItems;
  const tabs = [
    { value: "all" as const, label: "全部" },
    { value: "running" as const, label: "运行中" },
    { value: "stopped" as const, label: "已停止" },
    { value: "queued" as const, label: "排队中" },
    { value: "failed" as const, label: "异常" },
  ];
  const columns: Array<ListColumn<Instance>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, row) => (
        <DataTableNameCell
          name={
            <Link to="/gpu-instances/$instanceId" params={{ instanceId: row.id }}>
              {row.name}
            </Link>
          }
          id={row.id}
        />
      ),
    },
    {
      key: "state",
      title: "状态",
      width: 120,
      render: (_, row) => {
        const statusTag = <StatusTag status={row.state} />;

        return row.reason ? (
          <Tooltip content={row.reason}>
            <span className="inline-flex">{statusTag}</span>
          </Tooltip>
        ) : (
          statusTag
        );
      },
    },
    {
      key: "gpu",
      title: "GPU",
      width: 220,
      ellipsis: true,
      dataIndex: "compute.gpu_type",
      placeholder: "-",
    },
    {
      key: "image",
      title: "镜像",
      width: 100,
      ellipsis: true,
      render: (_, row) => getImageDisplayName(row.image),
    },
    {
      key: "replicas",
      title: "副本",
      width: 80,
      render: (_, row) =>
        row.container ? `${row.container.ready_replicas} / ${row.container.replicas}` : "-",
    },
    {
      key: "rollout",
      title: "发布",
      width: 120,
      render: (_, row) =>
        row.container?.rollout_status ? <StatusTag status={row.container.rollout_status} /> : "-",
    },
    {
      key: "node",
      title: "节点",
      width: 100,
      dataIndex: "compute.node_name",
      placeholder: "-",
    },
    {
      key: "created",
      title: "创建时间",
      width: 150,
      render: (_, row) => formatDateTime(row.created_at),
    },
  ];

  return (
    <>
      <ListPageFrame
        header={{
          iconClassName: "icon-GPUrongqishili",
          title: "GPU 容器实例",
          subtitle: "GPU 工作负载的调度、发布与运行状态",
          actions: [
            {
              key: "header-action-1",
              label: "创建 GPU 容器",
              iconClassName: "icon-add-1",
              variant: "primary",
              onClick: () => setCreateVisible(true),
            },
          ],
        }}
        tabs={{
          items: tabs,
          value: status,
          onChange: setStatus,
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
          refresh: {
            label: "刷新",
            spinning: query.isFetching,
            onClick: refresh,
          },
        }}
      >
        <ListDataTable
          data={items}
          columns={columns}
          rowActions={rowActions}
          loading={query.isFetching}
          emptyIconClassName="icon-GPU"
          emptyText={
            status === "all" && !keyword
              ? "还没有 GPU 容器实例，点击「创建 GPU 容器」开始"
              : "后端未返回符合当前条件的 GPU 容器实例"
          }
          tableLabel="GPU 容器实例列表"
          preserveTableOnEmpty
          pagination={{
            page,
            pageSize,
            total: query.data?.total ?? items.length,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </ListPageFrame>
      <GpuContainerCreateModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
        onCreated={() => {
          setCreateVisible(false);
          refresh();
        }}
      />
      {dialogNode}
    </>
  );
}
