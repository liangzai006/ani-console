import { listInstances, type InstanceRecord, type SandboxSessionState } from "@/api/instances";
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
import { SandboxInstanceCreateModal } from "@/components/instances/SandboxInstanceCreateModal";
import { useSandboxInstanceRowActions } from "./SandboxInstanceRowActions";

type SandboxInstance = InstanceRecord;
type SandboxStatus = "all" | SandboxSessionState;
type SearchField = "name" | "id";

function sessionStatus(instance: SandboxInstance) {
  return instance.sandbox?.session_state ?? instance.state;
}

export function SandboxInstancesPage() {
  const [status, setStatus] = useState<SandboxStatus>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [createVisible, setCreateVisible] = useState(false);

  const { query, page, pageSize, setPage, setPageSize, refresh } =
    useCursorPaginatedQuery<SandboxInstance>({
      errorNotification: {
        id: "sandboxes",
        action: "沙箱实例列表加载",
        fallback: "请求失败，请稍后重试",
      },
      queryKey: ["sandbox-instances", { status, searchField, searchText }],
      cursorScope: `sandbox:${status}:${searchField}:${searchText.trim()}`,
      fetchPage: async ({ cursor, limit }) => {
        const keyword = searchText.trim();
        return listInstances({
          kind: "sandbox",
          session_state: status === "all" ? undefined : status,
          search_field: keyword ? searchField : undefined,
          keyword: keyword || undefined,
          cursor,
          limit,
        });
      },
    });
  const { dialogNode, rowActions } = useSandboxInstanceRowActions(refresh);

  useEffect(() => setPage(1), [searchField, searchText, setPage, status]);

  const rows = (query.data?.items ?? []) as SandboxInstance[];
  const statusTabs = [
    { value: "all" as const, label: "全部" },
    { value: "pending" as const, label: "等待中" },
    { value: "running" as const, label: "运行中" },
    { value: "paused" as const, label: "已暂停" },
    { value: "expired" as const, label: "已过期" },
    { value: "stopped" as const, label: "已停止" },
  ];

  const columns: Array<ListColumn<SandboxInstance>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link to="/sandbox-instances/$instanceId" params={{ instanceId: item.id }}>
              {item.name || item.id}
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
      render: (_, item) => <StatusTag status={sessionStatus(item)} />,
    },
    {
      key: "template",
      title: "模板 / 镜像",
      width: 150,
      ellipsis: true,
      render: (_, item) => getImageDisplayName(item.image),
    },
    {
      key: "ttl",
      title: "会话时长",
      width: 110,
      dataIndex: "sandbox.session_timeout",
      placeholder: "-",
    },
    { key: "idle", title: "空闲剩余", width: 110, render: () => "-" },
    {
      key: "session",
      title: "关联会话",
      width: 110,
      render: (_, item) => (item.access?.exec_available ? "可连接" : "-"),
    },
    {
      key: "egress",
      title: "出口策略",
      width: 130,
      dataIndex: "sandbox.network_egress_policy",
      placeholder: "-",
    },
    {
      key: "created",
      title: "创建时间",
      width: 150,
      render: (_, item) => formatDateTime(item.created_at),
    },
  ];

  return (
    <>
      <ListPageFrame
        header={{
          iconClassName: "icon-Sandbox",
          title: "沙箱实例",
          subtitle: "隔离会话、双超时与受控网络出口",
          actions: [
            {
              key: "header-action-1",
              label: "创建 Sandbox",
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
          data={rows}
          columns={columns}
          rowActions={rowActions}
          loading={query.isFetching}
          emptyIconClassName="icon-Sandbox"
          emptyText="还没有沙箱实例，点击右上角创建"
          tableLabel="沙箱实例列表"
          preserveTableOnEmpty
          pagination={{
            page,
            pageSize,
            total: query.data?.total ?? rows.length,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </ListPageFrame>
      <SandboxInstanceCreateModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
        onCreated={() => setCreateVisible(false)}
      />
      {dialogNode}
    </>
  );
}
