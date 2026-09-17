import { listInstances, type InstanceRecord } from "@/api/instances";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  DataTableNameCell,
  ListPageFrame,
  StatusTag,
  type ListColumn,
  ListDataTable,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { formatDateTime } from "@/lib/format";
import { getImageDisplayName } from "@/lib/render";
import { InstanceOperationPoller } from "../InstanceOperationPoller";
import { VmInstanceCreateModal } from "../VmInstanceCreateModal";
import { useVmInstanceRowActions } from "./VmInstanceRowActions";

type VmInstance = InstanceRecord;
type StatusFilter = "all" | VmInstance["state"];

function specLabel(instance: VmInstance) {
  const cpu = instance.compute?.cpu;
  const memory = instance.compute?.memory;
  if (cpu == null || memory == null) return "-";
  const cpuValue = String(cpu);
  const memoryValue = String(memory);
  const cpuText = /^\d+(?:\.\d+)?$/.test(cpuValue) ? `${cpuValue}C` : cpuValue.replace(/c$/i, "C");
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
      errorNotification: {
        id: "vms",
        action: "云主机列表加载",
        fallback: "请求失败，请稍后重试",
      },
      queryKey: ["vm-instances", { status, searchText }],
      cursorScope: `vm:${status}:${searchText.trim()}`,
      fetchPage: async ({ cursor, limit }) => {
        const keyword = searchText.trim();
        return listInstances({
          kind: "vm",
          limit,
          cursor,
          status: status === "all" ? undefined : status,
          keyword: keyword || undefined,
        });
      },
    });

  useEffect(() => {
    setPage(1);
  }, [searchText, setPage, status]);

  const { dialogNode, rowActions } = useVmInstanceRowActions({
    onOperationSubmitted: setOperationId,
  });

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
            <Link from="/" to="/vm-instances/$instanceId" params={{ instanceId: row.id }}>
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
    { key: "spec", title: "规格", width: 80, render: (_, row) => specLabel(row) },
    {
      key: "image",
      title: "镜像",
      width: 100,
      ellipsis: true,
      render: (_, row) => getImageDisplayName(row.image),
    },
    {
      key: "ip",
      title: "私网 IP",
      width: 100,
      dataIndex: "network.private_ip",
      placeholder: "-",
    },
    {
      key: "node",
      title: "节点",
      width: 150,
      dataIndex: "compute.node_name",
      placeholder: "-",
    },
    {
      key: "protection",
      title: "终止保护",
      width: 100,
      render: (_, row) => (row.termination_protection ? "开启" : "关闭"),
    },
    {
      key: "createdAt",
      title: "创建时间",
      render: (_, row) => formatDateTime(row.created_at),
    },
  ];

  return (
    <>
      <ListPageFrame
        header={{
          iconClassName: "icon-yunzhuji",
          title: "云主机 VM",
          subtitle: "弹性虚拟计算资源，支持生命周期管理、VNC 控制台与运行状态观测",
          actions: [
            {
              key: "header-action-1",
              label: "创建云主机",
              iconClassName: "icon-add-1",
              variant: "primary",
              onClick: () => setCreateVisible(true),
            },
          ],
        }}
        tabs={{
          items: statusTabs,
          value: status,
          onChange: setStatus,
        }}
        toolbar={{
          search: {
            fields: [
              {
                value: "keyword",
                label: "名称 / ID",
              },
            ],
            field: "keyword",
            value: searchText,
            placeholder: "搜索云主机名称或 ID",
            onFieldChange: () => undefined,
            onChange: setSearchText,
          },
          refresh: {
            label: "刷新",
            spinning: query.isFetching,
            onClick: refresh,
          },
        }}
      >
        {operationId ? (
          <InstanceOperationPoller
            key={operationId}
            operationId={operationId}
            onComplete={(operationStatus) => {
              refresh();
              if (operationStatus === "succeeded") setOperationId(null);
            }}
          />
        ) : null}
        <ListDataTable
          data={items}
          columns={columns}
          rowActions={rowActions}
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
      {dialogNode}
    </>
  );
}
