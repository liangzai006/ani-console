import { Dropdown, Menu, Message, Popover } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ListDataTable,
  ListPageFrame,
  ListPageHeader,
  ListNameCell,
  ListRowActionButton,
  ListRowActions,
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
import { containerInstanceDataSource } from "./data-source";
import type {
  ContainerInstance,
  ContainerInstanceDataSource,
  ContainerInstanceSearchField,
  ContainerInstanceStatusFilter,
} from "./types";
import styles from "./container.module.css";

const TRANSITION_POLL_MS = 5000;
const ALL_COLUMN_KEYS = [
  "name",
  "kind",
  "status",
  "image",
  "cpuMemory",
  "replicas",
  "rolloutStatus",
  "node",
  "endpoint",
  "createdAt",
] as const;
type ColumnKey = (typeof ALL_COLUMN_KEYS)[number];

const COLUMN_LABELS: Record<ColumnKey, string> = {
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
      <Menu.Item key="resize">扩缩容</Menu.Item>
      <Menu.Item key="terminal">终端</Menu.Item>
    </Menu>
  );
}

export function ContainerInstancesPage({
  dataSource = containerInstanceDataSource,
}: {
  dataSource?: ContainerInstanceDataSource;
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ContainerInstanceStatusFilter>("all");
  const [searchField, setSearchField] =
    useState<ContainerInstanceSearchField>("name");
  const [searchText, setSearchText] = useState("");
  const keyword = useDebouncedValue(searchText, 200);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    ...ALL_COLUMN_KEYS,
  ]);

  useEffect(() => {
    setPage(1);
    setSelectedKeys([]);
  }, [keyword, searchField, status]);

  const query = useQuery({
    queryKey: [
      "container-instances",
      { status, searchField, keyword, page, pageSize },
    ],
    queryFn: () =>
      dataSource.list({ status, searchField, keyword, page, pageSize }),
    placeholderData: (previous) => previous,
    refetchInterval: (currentQuery) =>
      currentQuery.state.data?.hasTransitioningInstances
        ? TRANSITION_POLL_MS
        : false,
    refetchIntervalInBackground: false,
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
  const selectedRows = result.items.filter((item) =>
    selectedKeys.includes(item.id),
  );
  const canStart = selectedRows.some(
    (item) => item.status === "stopped" || item.status === "failed",
  );
  const canStop = selectedRows.some((item) => item.status === "running");

  const showStaticAction = (action: string, row?: ContainerInstance) => {
    Message.info(`${row?.name ?? "容器实例"}：${action}功能待接入`);
  };

  const showBatchAction = (action: string) => {
    Message.info(`${selectedRows.length} 个容器实例：${action}功能待接入`);
  };

  const handleMoreAction = (action: string, row: ContainerInstance) => {
    showStaticAction(action === "resize" ? "扩缩容" : "终端", row);
  };

  const allColumns: Array<ListColumn<ContainerInstance>> = [
    {
      key: "name",
      title: COLUMN_LABELS.name,
      render: (_, row) => (
        <ListNameCell
          name={
            <Link
              to="/instances/container/$instanceId"
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

  const columns = allColumns.filter((column) =>
    visibleColumns.includes(column.key as ColumnKey),
  );
  const statusTabs = [
    { value: "all" as const, label: "全部", count: result.statusCounts.all },
    {
      value: "running" as const,
      label: "运行中",
      count: result.statusCounts.running,
    },
    {
      value: "stopped" as const,
      label: "已停止",
      count: result.statusCounts.stopped,
    },
    {
      value: "deploying" as const,
      label: "部署中",
      count: result.statusCounts.deploying,
    },
    {
      value: "failed" as const,
      label: "异常",
      count: result.statusCounts.failed,
    },
  ];

  const columnSettings = (
    <div className={styles.columnSettings} aria-label="列设置">
      {ALL_COLUMN_KEYS.map((key) => (
        <label key={key} className={styles.columnSettingItem}>
          <input
            type="checkbox"
            checked={visibleColumns.includes(key)}
            disabled={key === "name"}
            onChange={() => {
              setVisibleColumns((current) =>
                current.includes(key)
                  ? current.filter((column) => column !== key)
                  : [...current, key],
              );
            }}
          />
          <span>{COLUMN_LABELS[key]}</span>
        </label>
      ))}
    </div>
  );

  return (
    <ListPageFrame
      header={
        <ListPageHeader
          iconClassName="icon-rongqishili"
          title="容器实例"
          subtitle="当前租户权限范围内的资源与操作"
          extra={
            <div className={styles.headerActions}>
              <ToolbarButton onClick={() => showStaticAction("导出")}>
                导出
              </ToolbarButton>
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => navigate({ to: "/instances/container/create" })}
              >
                创建容器实例
              </ToolbarButton>
            </div>
          }
        />
      }
      tabs={
        <StatusTabs items={statusTabs} value={status} onChange={setStatus} />
      }
      toolbar={
        <ListToolbar
          actions={
            <>
              {status !== "running" ? (
                <ToolbarButton
                  variant="secondary"
                  iconClassName="icon-check-circle"
                  disabled={!canStart}
                  onClick={() => showBatchAction("启动")}
                >
                  启动
                </ToolbarButton>
              ) : null}
              {status !== "stopped" && status !== "failed" ? (
                <ToolbarButton
                  variant="secondary"
                  iconClassName="icon-stop-circle"
                  disabled={!canStop}
                  onClick={() => showBatchAction("停止")}
                >
                  停止
                </ToolbarButton>
              ) : null}
              <Dropdown
                trigger="click"
                position="bl"
                disabled={selectedRows.length === 0}
                droplist={
                  <MoreActions
                    onAction={(action) =>
                      showBatchAction(action === "resize" ? "扩缩容" : "终端")
                    }
                  />
                }
              >
                <ToolbarButton
                  iconClassName="icon-more-1"
                  disabled={selectedRows.length === 0}
                >
                  更多
                </ToolbarButton>
              </Dropdown>
            </>
          }
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
              <Popover trigger="click" position="br" content={columnSettings}>
                <ToolbarIconButton
                  iconClassName="icon-setting"
                  label="列设置"
                />
              </Popover>
            </>
          }
        />
      }
    >
      <ListDataTable
        data={result.items}
        columns={[
          ...columns,
          {
            key: "__actions",
            title: "操作",
            fixed: "right",
            render: (_value, row) => {
              const isRunning = row.status === "running";
              const canStart =
                row.status === "stopped" || row.status === "failed";
              return (
                <ListRowActions>
                  {canStart ? (
                    <ListRowActionButton
                      onClick={() => showStaticAction("启动", row)}
                    >
                      启动
                    </ListRowActionButton>
                  ) : null}
                  {isRunning ? (
                    <>
                      <ListRowActionButton
                        onClick={() => showStaticAction("停止", row)}
                      >
                        停止
                      </ListRowActionButton>
                      <ListRowActionButton
                        onClick={() => showStaticAction("重启", row)}
                      >
                        重启
                      </ListRowActionButton>
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
                    <ListRowActionButton>
                      更多
                      <i
                        className={`iconfont icon-down-chevron-small ${styles.moreMenuIcon}`}
                        aria-hidden="true"
                      />
                    </ListRowActionButton>
                  </Dropdown>
                </ListRowActions>
              );
            },
          },
        ]}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => setSelectedKeys(keys.map(String)),
        }}
        loading={query.isLoading}
        emptyIconClassName="icon-rongqishili"
        emptyText={
          keyword || status !== "all"
            ? "没有符合条件的容器实例"
            : "还没有容器实例，点击「创建容器实例」开始"
        }
        tableLabel="容器实例列表"
        preserveTableOnEmpty
        pagination={{
          page,
          pageSize,
          total: result.total,
          onPageChange: (nextPage) => {
            setPage(nextPage);
            setSelectedKeys([]);
          },
          onPageSizeChange: (nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
            setSelectedKeys([]);
          },
        }}
      />
    </ListPageFrame>
  );
}
