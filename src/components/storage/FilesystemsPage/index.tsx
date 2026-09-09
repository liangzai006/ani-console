import { Link } from "@tanstack/react-router";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Dropdown, Menu, Modal } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { CreateFilesystemModal } from "@/components/storage/CreateFilesystemModal";
import { CreateFilesystemMountTargetModal } from "@/components/storage/CreateFilesystemMountTargetModal";
import { ExpandFilesystemModal } from "@/components/storage/ExpandFilesystemModal";
import {
  ListDataTable,
  DataTableNameCell,
  ListPageFrame,
  ListPageHeader,
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
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { listOrThrow } from "@/lib/api-list";
import { formatDateTime } from "@/lib/format";

type Filesystem = components["schemas"]["StorageFilesystem"];
type StatusFilter = "all" | "available" | "pending";
type SearchField = "name" | "id";

export function FilesystemsPage() {
  const qc = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const [expandTarget, setExpandTarget] = useState<Filesystem | null>(null);
  const [mountTargetFilesystem, setMountTargetFilesystem] = useState<Filesystem | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const {
    query: filesystems,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  } = useCursorPaginatedQuery<Filesystem>({
    queryKey: ["filesystems", { status, searchField, searchText }],
    cursorScope: `${status}:${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      const keyword = searchText.trim();
      const { data, error } = await coreApi.GET("/filesystems", {
        params: {
          query: asUncontractedQuery({
            limit,
            cursor,
            status: status === "all" ? undefined : status,
            search_field: keyword ? searchField : undefined,
            keyword: keyword || undefined,
          }),
        },
      });
      if (error || !data) throw error ?? new Error("文件存储列表未返回结果");
      return data;
    },
  });
  const remove = useMutation({
    mutationFn: async (item: Filesystem) => {
      const { error } = await coreApi.DELETE("/filesystems/{filesystem_id}", {
        params: { path: { filesystem_id: item.id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      resetPagination();
      void qc.invalidateQueries({ queryKey: ["filesystems"] });
    },
    onError: (error) => showApiError(error),
  });
  const items = useMemo(
    () => (filesystems.data?.items ?? []) as Filesystem[],
    [filesystems.data?.items],
  );
  const paginationTotal = filesystems.data?.total ?? items.length;
  useListErrorNotification({
    id: "filesystems-list",
    title: "文件存储列表加载失败",
    error: filesystems.error,
  });
  const mountTargetQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["filesystem-mounts", item.id, "count"],
      queryFn: () =>
        listOrThrow(() =>
          coreApi.GET("/filesystems/{filesystem_id}/mount-targets", {
            params: {
              path: { filesystem_id: item.id },
              query: { limit: 1 },
            },
          }),
        ),
    })),
  });
  const mountTargetCounts = new Map(
    items.map((item, index) => [item.id, mountTargetQueries[index]?.data?.total]),
  );
  const columns: Array<ListColumn<Filesystem>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link to="/filesystems/$filesystemId" params={{ filesystemId: item.id }}>
              {item.name}
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
      render: (_, item) => <StatusTag status={item.state} />,
    },
    {
      key: "size",
      title: "容量",
      render: (_, item) => `${item.size_gib} GiB`,
    },
    {
      key: "protocol",
      title: "协议",
      render: (_, item) => item.protocol.toUpperCase(),
    },
    {
      key: "performanceMode",
      title: "性能模式",
      render: (_, item) =>
        item.performance_mode === "standard"
          ? "标准型"
          : item.performance_mode === "throughput"
            ? "吞吐型"
            : "-",
    },
    {
      key: "mountTargetCount",
      title: "挂载目标数",
      render: (_, item) => mountTargetCounts.get(item.id) ?? "-",
    },
    {
      key: "createdAt",
      title: "创建时间",
      render: (_, item) => formatDateTime(item.created_at),
    },
  ];
  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-wenjiancunchu"
            title="文件存储"
            subtitle="管理共享文件系统、挂载目标与访问方式"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setCreateVisible(true)}
              >
                创建文件存储
              </ToolbarButton>
            }
          />
        }
        tabs={
          <StatusTabs
            value={status}
            onChange={setStatus}
            items={[
              { value: "all", label: "全部" },
              { value: "available", label: "可用" },
              { value: "pending", label: "创建中" },
            ]}
          />
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
                spinning={filesystems.isFetching}
                onClick={refresh}
              />
            }
          />
        }
      >
        <ListDataTable
          data={items}
          columns={[
            ...columns,
            {
              key: "__actions",
              title: "操作",
              fixed: "right",
              render: (_value, item) => (
                <DataTableRowActions>
                  <DataTableRowActionButton onClick={() => setExpandTarget(item)}>
                    扩容
                  </DataTableRowActionButton>
                  <Dropdown
                    trigger="click"
                    position="br"
                    droplist={
                      <Menu>
                        <Menu.Item
                          key="mount-target"
                          onClick={() => setMountTargetFilesystem(item)}
                        >
                          添加挂载目标
                        </Menu.Item>
                        <Menu.Item
                          key="delete"
                          style={{ color: "var(--color-danger-6)" }}
                          onClick={() =>
                            Modal.confirm({
                              title: "删除文件存储",
                              content: `确定删除「${item.name}」？请先确认没有实例正在使用该文件系统。`,
                              okButtonProps: { status: "danger" },
                              onOk: () => remove.mutateAsync(item),
                            })
                          }
                        >
                          删除
                        </Menu.Item>
                      </Menu>
                    }
                  >
                    <DataTableRowActionButton>
                      更多
                      <i className="iconfont icon-down-chevron-small" aria-hidden="true" />
                    </DataTableRowActionButton>
                  </Dropdown>
                </DataTableRowActions>
              ),
            },
          ]}
          loading={filesystems.isFetching}
          emptyIconClassName="icon-wenjiancunchu"
          emptyText={
            searchText || status !== "all"
              ? "没有符合条件的文件存储"
              : "还没有文件存储，点击「创建文件存储」开始"
          }
          tableLabel="文件存储列表"
          preserveTableOnEmpty
          pagination={{
            page,
            pageSize,
            total: paginationTotal,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </ListPageFrame>
      <CreateFilesystemModal visible={createVisible} onCancel={() => setCreateVisible(false)} />
      <ExpandFilesystemModal
        visible={Boolean(expandTarget)}
        filesystem={expandTarget}
        onCancel={() => setExpandTarget(null)}
      />
      <CreateFilesystemMountTargetModal
        visible={Boolean(mountTargetFilesystem)}
        filesystemId={mountTargetFilesystem?.id ?? ""}
        onCancel={() => setMountTargetFilesystem(null)}
      />
    </>
  );
}
