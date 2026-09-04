import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { coreApi } from "@/api/client";
import type { components } from "@/api/core-schema";
import {
  AsyncTaskPoller,
  DataTableNameCell,
  ImageNameText,
  ListDataTable,
  ListPageFrame,
  ListPageHeader,
  ListToolbar,
  StatusTabs,
  StatusTag,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatDateTime } from "@/lib/format";
import { VmInstanceActions } from "../VmInstanceActions";
import { VmInstanceCreateModal } from "../VmInstanceCreateModal";

type VmInstance = components["schemas"]["InstanceRecord"];
type StatusFilter = "all" | VmInstance["state"];

function specLabel(instance: VmInstance) {
  const cpu = instance.compute?.cpu;
  const memory = instance.compute?.memory;
  if (cpu == null || memory == null) return "-";
  const cpuValue = String(cpu);
  const memoryValue = String(memory);
  const cpuText = /^\d+(?:\.\d+)?$/.test(cpuValue)
    ? `${cpuValue}C`
    : cpuValue.replace(/c$/i, "C");
  const memoryText = /^\d+(?:\.\d+)?$/.test(memoryValue)
    ? `${memoryValue}G`
    : memoryValue.replace(/gi$/i, "G").replace(/g$/i, "G");
  return `${cpuText}${memoryText}`;
}

export function VmInstancesPage() {
  const [createVisible, setCreateVisible] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchText, setSearchText] = useState("");
  const { query, page, pageSize, setPage, setPageSize, refresh } =
    useCursorPaginatedQuery<VmInstance>({
      queryKey: ["vm-instances", { status, searchText }],
      cursorScope: `vm:${status}:${searchText.trim()}`,
      fetchPage: async ({ cursor, limit }) => {
        const keyword = searchText.trim();
        const { data, error } = await coreApi.GET("/instances", {
          params: {
            query: {
              kind: "vm",
              limit,
              cursor,
              state: status === "all" ? undefined : status,
              keyword: keyword || undefined,
            },
          },
        });
        if (error || !data) throw error ?? new Error("云主机列表未返回结果");
        return data;
      },
    });

  useListErrorNotification({
    id: "vm-instances:list",
    title: "云主机列表加载失败",
    error: query.error,
  });

  useEffect(() => {
    setPage(1);
  }, [searchText, setPage, status]);

  const items = query.data?.items ?? [];
  const statusTabs = [
    { value: "all" as const, label: "全部" },
    { value: "running" as const, label: "运行中" },
    { value: "stopped" as const, label: "已停止" },
    { value: "failed" as const, label: "异常" },
  ];
  const columns: Array<ListColumn<VmInstance>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, row) => (
        <DataTableNameCell
          name={
            <Link
              from="/"
              to="/vm-instances/$instanceId"
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
      render: (_, row) => <StatusTag status={row.state} />,
    },
    { key: "spec", title: "规格", render: (_, row) => specLabel(row) },
    {
      key: "image",
      title: "镜像",
      width: 220,
      render: (_, row) => <ImageNameText image={row.image} />,
    },
    {
      key: "ip",
      title: "私网 IP",
      render: (_, row) => row.network?.private_ip ?? "-",
    },
    {
      key: "node",
      title: "节点",
      render: (_, row) => row.compute?.node_name ?? "-",
    },
    {
      key: "protection",
      title: "终止保护",
      render: (_, row) => (row.termination_protection ? "开启" : "关闭"),
    },
    {
      key: "createdAt",
      title: "创建时间",
      render: (_, row) => formatDateTime(row.created_at),
    },
    {
      key: "__actions",
      title: "操作",
      fixed: "right",
      render: (_, row) => (
        <VmInstanceActions
          instance={row}
          onOperationSubmitted={setOperationId}
        />
      ),
    },
  ];

  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-yunzhuji"
            title="云主机 VM"
            subtitle="弹性虚拟计算资源，支持生命周期管理、VNC 控制台与运行状态观测"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setCreateVisible(true)}
              >
                创建云主机
              </ToolbarButton>
            }
          />
        }
        tabs={
          <StatusTabs items={statusTabs} value={status} onChange={setStatus} />
        }
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSearch
                fields={[{ value: "keyword", label: "名称 / ID" }]}
                field="keyword"
                value={searchText}
                placeholder="搜索云主机名称或 ID"
                onFieldChange={() => undefined}
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
        {operationId ? (
          <AsyncTaskPoller
            taskId={operationId}
            onComplete={() => {
              setOperationId(null);
              refresh();
            }}
          />
        ) : null}
        <ListDataTable
          data={items}
          columns={columns}
          loading={query.isFetching}
          emptyIconClassName="icon-yunzhuji"
          emptyText={
            status === "all" && !searchText.trim()
              ? "还没有云主机，点击「创建云主机」开始"
              : "后端未返回符合当前条件的云主机"
          }
          tableLabel="云主机 VM 列表"
          pagination={{
            page,
            pageSize,
            total: query.data?.total ?? items.length,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </ListPageFrame>
      <VmInstanceCreateModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
        onCreated={(id) => {
          setCreateVisible(false);
          setOperationId(id ?? null);
          refresh();
        }}
      />
    </>
  );
}
