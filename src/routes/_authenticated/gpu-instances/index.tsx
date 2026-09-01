import { Link, createFileRoute } from "@tanstack/react-router";
import { Tooltip } from "@arco-design/web-react";
import { useEffect, useMemo, useState } from "react";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { GpuInstanceActions } from "@/components/gpu-instances/GpuInstanceActions";
import { GpuContainerCreateModal } from "@/components/gpu-instances/GpuContainerCreateModal";
import {
  ListDataTable,
  DataTableNameCell,
  ListPageFrame,
  ListPageHeader,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
  StatusTag,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatDateTime } from "@/lib/format";

type Instance = components["schemas"]["InstanceRecord"];
type StatusFilter = "all" | "running" | "stopped" | "queued" | "failed";
type SearchField = "name" | "id";

export const Route = createFileRoute("/_authenticated/gpu-instances/")({
  component: GpuInstancesPage,
});

function GpuInstancesPage() {
  const [createVisible, setCreateVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const { query, page, pageSize, setPage, setPageSize, refresh } =
    useCursorPaginatedQuery<Instance>({
      queryKey: ["instances", "gpu_container"],
      cursorScope: `gpu:${status}:${searchField}:${searchText.trim()}`,
      fetchPage: async ({ cursor, limit }) => {
        const { data, error } = await coreApi.GET("/instances", {
          params: { query: { limit, cursor, kind: "gpu_container" } },
        });
        if (error || !data)
          throw error ?? new Error("GPU 容器实例列表未返回结果");
        return data;
      },
    });
  useListErrorNotification({
    id: "gpu-container-list",
    title: "GPU 容器实例列表加载失败",
    error: query.error,
  });
  useEffect(() => {
    setPage(1);
  }, [searchField, searchText, status, setPage]);

  const allItems = (query.data?.items ?? []) as Instance[];
  const items = useMemo(
    () =>
      allItems.filter((item) => {
        if (status === "running" && item.state !== "running") return false;
        if (status === "stopped" && item.state !== "stopped") return false;
        if (status === "failed" && item.state !== "failed") return false;
        if (
          status === "queued" &&
          !["pending", "provisioning", "starting"].includes(item.state)
        )
          return false;
        const keyword = searchText.trim().toLowerCase();
        return (
          !keyword ||
          String(searchField === "id" ? item.id : item.name)
            .toLowerCase()
            .includes(keyword)
        );
      }),
    [allItems, searchField, searchText, status],
  );
  const tabs = [
    { value: "all" as const, label: "全部", count: allItems.length },
    {
      value: "running" as const,
      label: "运行中",
      count: allItems.filter((item) => item.state === "running").length,
    },
    {
      value: "stopped" as const,
      label: "已停止",
      count: allItems.filter((item) => item.state === "stopped").length,
    },
    {
      value: "queued" as const,
      label: "排队中",
      count: allItems.filter((item) =>
        ["pending", "provisioning", "starting"].includes(item.state),
      ).length,
    },
    {
      value: "failed" as const,
      label: "异常",
      count: allItems.filter((item) => item.state === "failed").length,
    },
  ];
  const columns: Array<ListColumn<Instance>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, row) => (
        <DataTableNameCell
          name={
            <Link
              to="/gpu-instances/$instanceId"
              params={{ instanceId: row.id }}
            >
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
      render: (_, row) =>
        row.gpu?.model ? `${row.gpu.model} × ${row.gpu.count ?? 1}` : "—",
    },
    {
      key: "image",
      title: "镜像",
      width: 240,
      render: (_, row) => {
        const image = row.image?.ref ?? row.image?.name ?? row.image?.id ?? "—";

        return (
          <Tooltip content={image}>
            <span className="block max-w-56 truncate">{image}</span>
          </Tooltip>
        );
      },
    },
    {
      key: "replicas",
      title: "副本",
      render: (_, row) =>
        row.container
          ? `${row.container.ready_replicas} / ${row.container.replicas}`
          : "—",
    },
    {
      key: "rollout",
      title: "发布",
      render: (_, row) => row.container?.rollout_status ?? "—",
    },
    { key: "node", title: "节点", render: (_, row) => row.node_name ?? "—" },
    {
      key: "created",
      title: "创建时间",
      render: (_, row) => formatDateTime(row.created_at),
    },
    {
      key: "actions",
      title: "操作",
      width: 320,
      fixed: "right",
      render: (_, row) => (
        <GpuInstanceActions instance={row} onChanged={refresh} />
      ),
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
            searchText || status !== "all"
              ? "没有符合条件的 GPU 容器实例"
              : "还没有 GPU 容器实例，点击「创建 GPU 容器」开始"
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
