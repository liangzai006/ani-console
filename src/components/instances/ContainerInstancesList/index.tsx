import { Dropdown, Menu, Message, Modal } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { useEffect, useState } from "react";
import {
  ListDataTable,
  ListPageFrame,
  ListPageHeader,
  DataTableNameCell,
  DataTableRowActionButton,
  DataTableRowActions,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
  StatusTag,
} from "@/components/common";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { formatDateTime } from "@/lib/format";
import { coreApi } from "@/api/client";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { ContainerInstanceCreateModal } from "@/components/instances/ContainerInstanceCreateModal";
import { containerInstanceDataSource } from "./data-source";
import type {
  ContainerInstance,
  ContainerInstanceDataSource,
  ContainerInstanceSearchField,
  ContainerInstanceStatusFilter,
} from "./types";
import styles from "./index.module.css";

const COLUMN_LABELS = {
  name: "名称",
  kind: "类型",
  status: "状态",
  image: "镜像",
  cpuMemory: "CPU / 内存",
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

function MoreActions({ onAction }: { onAction: (action: string) => void }) {
  return (
    <Menu onClickMenuItem={onAction}>
      <Menu.Item key="terminal">终端</Menu.Item>
      <Menu.Item key="detail">查看详情</Menu.Item>
      <Menu.Item key="delete">删除</Menu.Item>
    </Menu>
  );
}

export function ContainerInstancesPage({
  dataSource = containerInstanceDataSource,
}: {
  dataSource?: ContainerInstanceDataSource;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lifecycleScope = useIdempotencyScope("container-instance-lifecycle", ["POST"]);
  const [status, setStatus] = useState<ContainerInstanceStatusFilter>("all");
  const [searchField, setSearchField] =
    useState<ContainerInstanceSearchField>("name");
  const [searchText, setSearchText] = useState("");
  const keyword = useDebouncedValue(searchText, 200);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createVisible, setCreateVisible] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [keyword, searchField, status]);

  const query = useQuery({
    queryKey: [
      "container-instances",
      { status, searchField, keyword, page, pageSize },
    ],
    queryFn: () =>
      dataSource.list({ status, searchField, keyword, page, pageSize }),
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
    statusCounts: { all: 0, running: 0, stopped: 0, deploying: 0, failed: 0 },
    hasTransitioningInstances: false,
  };
  const lifecycle = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "start" | "stop" | "restart" | "delete" }) => {
      await Promise.all(ids.map(async (instanceId) => {
        const submitData = { action };
        const { error, response } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
          params: { path: { instance_id: instanceId } },
          body: lifecycleScope.withKey(submitData, [instanceId]),
        });
        if (error) throw { ...(typeof error === "object" && error ? error : { message: String(error) }), status: response.status };
      }));
      return { count: ids.length, action, ids };
    },
    onSuccess: ({ count, action, ids }) => {
      ids.forEach((instanceId) => lifecycleScope.reset([instanceId]));
      const labels = { start: "启动", stop: "停止", restart: "重启", delete: "删除" };
      Message.success(`${count} 个容器实例的${labels[action]}操作已提交`);
      void queryClient.invalidateQueries({ queryKey: ["container-instances"] });
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  const runLifecycle = (rows: ContainerInstance[], action: "start" | "stop" | "restart" | "delete") => {
    const submit = () => lifecycle.mutate({ ids: rows.map((row) => row.id), action });
    if (action === "stop" || action === "delete") {
      Modal.confirm({
        title: action === "delete" ? "删除容器实例" : "停止容器实例",
        content: `确认对 ${rows.length} 个容器实例执行${action === "delete" ? "删除" : "停止"}？${action === "delete" ? "删除后资源不可恢复。" : ""}`,
        okButtonProps: action === "delete" ? { status: "danger" } : undefined,
        onOk: submit,
      });
      return;
    }
    submit();
  };

  const handleMoreAction = (action: string, row: ContainerInstance) => {
    if (action === "terminal") window.open(`/instance-terminal/${encodeURIComponent(row.id)}`, `container-terminal-${row.id}`, "width=1200,height=800,scrollbars=1,resizable=1");
    if (action === "detail") navigate({ to: "/container-instances/$instanceId", params: { instanceId: row.id } });
    if (action === "delete") runLifecycle([row], "delete");
  };

  const allColumns: Array<ListColumn<ContainerInstance>> = [
    {
      key: "name",
      title: COLUMN_LABELS.name,
      render: (_, row) => (
        <DataTableNameCell
          name={
            <Link
              to="/container-instances/$instanceId"
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
      key: "status",
      title: COLUMN_LABELS.status,
      width: 120,
      render: (_, row) => <StatusTag status={row.status} />,
    },
    {
      key: "image",
      title: COLUMN_LABELS.image,
      render: (_, row) => row.image,
    },
    {
      key: "cpuMemory",
      title: COLUMN_LABELS.cpuMemory,
      render: (_, row) => row.cpuMemory,
    },
    {
      key: "replicas",
      title: COLUMN_LABELS.replicas,
      render: (_, row) => row.replicas,
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
      render: (_, row) => row.node,
    },
    {
      key: "endpoint",
      title: COLUMN_LABELS.endpoint,
      render: (_, row) => row.endpoint,
    },
    {
      key: "createdAt",
      title: COLUMN_LABELS.createdAt,
      render: (_, row) => formatDateTime(row.createdAt),
    },
  ];

  const statusTabs = [
    { value: "all" as const, label: "全部", count: result.statusCounts.all },
    { value: "running" as const, label: "运行中", count: result.statusCounts.running },
    { value: "stopped" as const, label: "已停止", count: result.statusCounts.stopped },
    { value: "deploying" as const, label: "部署中", count: result.statusCounts.deploying },
    { value: "failed" as const, label: "异常", count: result.statusCounts.failed },
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
            render: (_value, row) => {
              const isRunning = row.status === "running";
              const canStart =
                row.status === "stopped" || row.status === "failed";
              return (
                <DataTableRowActions>
                  {canStart ? (
                    <DataTableRowActionButton
                      onClick={() => runLifecycle([row], "start")}
                    >
                      启动
                    </DataTableRowActionButton>
                  ) : null}
                  {isRunning ? (
                    <>
                      <DataTableRowActionButton
                        onClick={() => runLifecycle([row], "stop")}
                      >
                        停止
                      </DataTableRowActionButton>
                      <DataTableRowActionButton
                        onClick={() => runLifecycle([row], "restart")}
                      >
                        重启
                      </DataTableRowActionButton>
                    </>
                  ) : null}
                  <Dropdown
                    trigger="click"
                    position="br"
                    droplist={
                      <MoreActions
                        onAction={(action) => handleMoreAction(action, row)}
                      />
                    }
                  >
                    <DataTableRowActionButton>
                      更多
                      <i
                        className={clsx(
                          "iconfont",
                          "icon-down-chevron-small",
                          styles.moreMenuIcon,
                        )}
                        aria-hidden="true"
                      />
                    </DataTableRowActionButton>
                  </Dropdown>
                </DataTableRowActions>
              );
            },
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
