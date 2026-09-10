import { listInstances, type InstanceRecord } from "@/api/instances";
import { Link } from "@tanstack/react-router";
import { Tooltip } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { GpuInstanceActions } from "@/components/instances/GpuInstanceActions";
import { GpuContainerCreateModal } from "@/components/instances/GpuContainerCreateModal";
import {
  ListDataTable,
  DataTableNameCell,
  ListPageFrame,
  ListPageHeader,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  ListToolbar,
  type ListColumn,
  StatusTag,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatDateTime } from "@/lib/format";
import { getImageDisplayName } from "@/lib/render";

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
  useListErrorNotification({
    id: "gpu-container-list",
    title: "GPU 容器实例列表加载失败",
    error: query.error,
  });
  useEffect(() => {
    setPage(1);
  }, [keyword, searchField, status, setPage]);

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
      ellipsis: true,
      render: (_, row) => getImageDisplayName(row.image),
    },
    {
      key: "replicas",
      title: "副本",
      render: (_, row) =>
        row.container ? `${row.container.ready_replicas} / ${row.container.replicas}` : "-",
    },
    {
      key: "rollout",
      title: "发布",
      render: (_, row) =>
        row.container?.rollout_status ? <StatusTag status={row.container.rollout_status} /> : "-",
    },
    {
      key: "node",
      title: "节点",
      dataIndex: "compute.node_name",
      placeholder: "-",
    },
    {
      key: "created",
      title: "创建时间",
      render: (_, row) => formatDateTime(row.created_at),
    },
    {
      key: "actions",
      title: "操作",
      fixed: "right",
      render: (_, row) => <GpuInstanceActions instance={row} onChanged={refresh} />,
    },
  ];

  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-GPUrongqishili"
            title="GPU 容器实例"
            subtitle="GPU 工作负载的调度、发布与运行状态"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setCreateVisible(true)}
              >
                创建 GPU 容器
              </ToolbarButton>
            }
          />
        }
        tabs={<StatusTabs items={tabs} value={status} onChange={setStatus} />}
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
                spinning={query.isFetching}
                onClick={refresh}
              />
            }
          />
        }
      >
        <ListDataTable
          data={items}
          columns={columns}
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
    </>
  );
}
