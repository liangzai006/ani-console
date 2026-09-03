import { Dropdown, Menu, Message, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import {
  DataTableNameCell,
  DataTableRowActionButton,
  DataTableRowActions,
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
import { newIdempotencyKey } from "@/lib/idempotency";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { SandboxInstanceCreateModal } from "@/components/instances/SandboxInstanceCreateModal";

type SandboxInstance = components["schemas"]["InstanceRecord"];
type SandboxStatus = "all" | "running" | "paused" | "expired";
type SearchField = "name" | "id";
type LifecycleAction = "pause" | "resume" | "extend" | "touch_idle" | "delete";

function openTerminal(instanceId: string) {
  window.open(
    `/instance-terminal/${encodeURIComponent(instanceId)}`,
    `Sandbox ${instanceId}`,
    "width=1200,height=800,scrollbars=1,resizable=1",
  );
}

function imageLabel(instance: SandboxInstance) {
  return instance.image?.ref ?? instance.image?.name ?? "-";
}

function sessionStatus(instance: SandboxInstance) {
  return instance.sandbox?.session_state ?? instance.state;
}

export function SandboxInstancesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SandboxStatus>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [createVisible, setCreateVisible] = useState(false);

  const { query, page, pageSize, setPage, setPageSize, refresh } =
    useCursorPaginatedQuery<SandboxInstance>({
      queryKey: ["sandbox-instances", { status, searchField, searchText }],
      cursorScope: `sandbox:${status}:${searchField}:${searchText.trim()}`,
      fetchPage: async ({ cursor, limit }) => {
        const keyword = searchText.trim();
        const { data, error } = await coreApi.GET("/instances", {
          params: {
            query: asUncontractedQuery({
              kind: "sandbox",
              status: status === "all" ? undefined : status,
              search_field: keyword ? searchField : undefined,
              keyword: keyword || undefined,
              cursor,
              limit,
            }),
          },
        });
        if (error || !data)
          throw error ?? new Error("Sandbox 实例列表未返回结果");
        return data;
      },
    });

  useListErrorNotification({
    id: "sandbox-instances:list",
    title: "Sandbox 实例列表加载失败",
    error: query.error,
  });

  const lifecycle = useMutation({
    mutationFn: async ({
      id,
      action,
      duration,
    }: {
      id: string;
      action: LifecycleAction;
      duration?: string;
    }) => {
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: id } },
          body: { action, duration, idempotency_key: newIdempotencyKey() },
        },
      );
      if (error) {
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error) }),
          status: response.status,
        };
      }
      return { action };
    },
    onSuccess: ({ action }) => {
      Message.success(action === "delete" ? "Sandbox 已销毁" : "操作已提交");
      queryClient.invalidateQueries({ queryKey: ["sandbox-instances"] });
      queryClient.invalidateQueries({ queryKey: ["instance"] });
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  useEffect(() => setPage(1), [searchField, searchText, setPage, status]);

  const confirmDestroy = (instance: SandboxInstance) => {
    Modal.confirm({
      title: "销毁 Sandbox",
      content: `确认销毁 ${instance.name || instance.id}？工作区和未保存数据将不可恢复。`,
      okButtonProps: { status: "danger" },
      onOk: () => lifecycle.mutateAsync({ id: instance.id, action: "delete" }),
    });
  };

  const rows = (query.data?.items ?? []) as SandboxInstance[];
  const statusTabs = [
    {
      value: "all" as const,
      label: "全部",
      count: query.data?.total ?? rows.length,
    },
    {
      value: "running" as const,
      label: "运行中",
      count: rows.filter((item) => sessionStatus(item) === "running").length,
    },
    {
      value: "paused" as const,
      label: "已暂停",
      count: rows.filter((item) => sessionStatus(item) === "stopped").length,
    },
    {
      value: "expired" as const,
      label: "已过期",
      count: rows.filter((item) => sessionStatus(item) === "expired").length,
    },
  ];

  const columns: Array<ListColumn<SandboxInstance>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link
              to="/sandbox-instances/$instanceId"
              params={{ instanceId: item.id }}
            >
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
      width: 110,
      render: (_, item) => <StatusTag status={sessionStatus(item)} />,
    },
    {
      key: "template",
      title: "模板 / 镜像",
      render: (_, item) => imageLabel(item),
    },
    {
      key: "ttl",
      title: "会话时长",
      width: 110,
      render: (_, item) => item.sandbox?.session_timeout ?? "-",
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
      render: (_, item) => item.sandbox?.network_egress_policy ?? "-",
    },
    {
      key: "created",
      title: "创建时间",
      width: 180,
      render: (_, item) => formatDateTime(item.created_at),
    },
    {
      key: "actions",
      title: "操作",
      width: 160,
      fixed: "right",
      render: (_, item) => {
        const state = sessionStatus(item);
        const running = state === "running";
        const more = (
          <Menu>
            <Menu.Item
              key="extend"
              disabled={state === "expired"}
              onClick={() =>
                lifecycle.mutate({
                  id: item.id,
                  action: "extend",
                  duration: "1h",
                })
              }
            >
              延长 1 小时
            </Menu.Item>
            <Menu.Item
              key="touch"
              disabled={!running}
              onClick={() =>
                lifecycle.mutate({
                  id: item.id,
                  action: "touch_idle",
                  duration: "30m",
                })
              }
            >
              活跃续期
            </Menu.Item>
            <Menu.Item
              key="terminal"
              disabled={!running}
              onClick={() => openTerminal(item.id)}
            >
              打开终端
            </Menu.Item>
            <Menu.Item
              key="destroy"
              style={{ color: "var(--color-danger-6)" }}
              onClick={() => confirmDestroy(item)}
            >
              销毁
            </Menu.Item>
          </Menu>
        );
        return (
          <DataTableRowActions>
            <DataTableRowActionButton
              disabled={state === "expired"}
              onClick={() =>
                lifecycle.mutate({
                  id: item.id,
                  action: running ? "pause" : "resume",
                })
              }
            >
              {running ? "暂停" : "恢复"}
            </DataTableRowActionButton>
            <Dropdown trigger="click" position="br" droplist={more}>
              <DataTableRowActionButton disabled={lifecycle.isPending}>
                更多
                <i
                  className="iconfont icon-down-chevron-small ml-1"
                  aria-hidden="true"
                />
              </DataTableRowActionButton>
            </Dropdown>
          </DataTableRowActions>
        );
      },
    },
  ];

  return (
    <ListPageFrame
      header={
        <ListPageHeader
          iconClassName="icon-Sandbox"
          title="Sandbox 实例"
          subtitle="隔离会话、双超时与受控网络出口"
          extra={
            <ToolbarButton
              variant="primary"
              iconClassName="icon-add-1"
              onClick={() => setCreateVisible(true)}
            >
              创建 Sandbox
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
        data={rows}
        columns={columns}
        loading={query.isFetching}
        emptyIconClassName="icon-Sandbox"
        emptyText="还没有 Sandbox 实例，点击右上角创建"
        tableLabel="Sandbox 实例列表"
        preserveTableOnEmpty
        pagination={{
          page,
          pageSize,
          total: query.data?.total ?? rows.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
      />
      <SandboxInstanceCreateModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
        onCreated={(instanceId) => {
          setCreateVisible(false);
          navigate({
            to: "/sandbox-instances/$instanceId",
            params: { instanceId },
          });
        }}
      />
    </ListPageFrame>
  );
}
