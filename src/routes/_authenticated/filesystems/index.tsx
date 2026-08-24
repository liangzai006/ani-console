import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@arco-design/web-react";
import { useEffect, useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { CreateFilesystemModal } from "@/components/storage/CreateFilesystemModal";
import {
  DataTable,
  ListNameCell,
  ListPageFrame,
  ListPageHeader,
  ListRowActionButton,
  ListRowActions,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/pagebase";
import { StatusTag } from "@/components/shell/StatusTag";
import { listOrThrow } from "@/lib/api-list";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";

type Filesystem = components["schemas"]["StorageFilesystem"];
type StatusFilter = "all" | "available" | "pending";
type SearchField = "name" | "id";

export const Route = createFileRoute("/_authenticated/filesystems/")({
  component: FilesystemsPage,
});

function FilesystemsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filesystems = useQuery({
    queryKey: ["filesystems"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/filesystems", { params: { query: { limit: 100 } } }),
      ),
  });
  const remove = useMutation({
    mutationFn: async (item: Filesystem) => {
      const { error } = await coreApi.DELETE("/filesystems/{filesystem_id}", {
        params: { path: { filesystem_id: item.id } },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["filesystems"] }),
    onError: (error) => showApiError(error),
  });
  const items = (filesystems.data?.items ?? []) as Filesystem[];
  const counts = useMemo(
    () => ({
      all: items.length,
      available: items.filter((item) => item.state === "available").length,
      pending: items.filter((item) => item.state === "pending").length,
    }),
    [items],
  );
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return items.filter(
      (item) =>
        (status === "all" || item.state === status) &&
        (!keyword || String(item[searchField]).toLowerCase().includes(keyword)),
    );
  }, [items, searchField, searchText, status]);
  const pagedItems = filteredItems.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  useEffect(() => setPage(1), [searchField, searchText, status]);
  const columns: Array<ListColumn<Filesystem>> = [
    {
      key: "name",
      title: "名称 / ID",
      minWidth: 240,
      render: (item) => (
        <ListNameCell
          name={
            <Link
              to="/filesystems/$filesystemId"
              params={{ filesystemId: item.id }}
            >
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
      render: (item) => <StatusTag status={item.state} />,
    },
    {
      key: "protocol",
      title: "协议",
      width: 110,
      render: (item) => item.protocol.toUpperCase(),
    },
    {
      key: "size",
      title: "容量 (GiB)",
      width: 120,
      render: (item) => item.size_gib,
    },
    {
      key: "endpoint",
      title: "挂载端点",
      minWidth: 220,
      render: (item) => item.endpoint ?? "—",
    },
    {
      key: "createdAt",
      title: "创建时间",
      minWidth: 190,
      render: (item) => formatDateTime(item.created_at),
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
              { value: "all", label: "全部", count: counts.all },
              { value: "available", label: "可用", count: counts.available },
              { value: "pending", label: "创建中", count: counts.pending },
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
                onClick={() => void filesystems.refetch()}
              />
            }
          />
        }
      >
        <DataTable
          rows={pagedItems}
          rowKey={(item) => item.id}
          columns={columns}
          selectable={false}
          loading={filesystems.isLoading}
          error={
            filesystems.error
              ? getErrorMessage(filesystems.error, "文件存储列表加载失败")
              : null
          }
          onRetry={() => void filesystems.refetch()}
          emptyIconClassName="icon-wenjiancunchu"
          emptyText={
            searchText || status !== "all"
              ? "没有符合条件的文件存储"
              : "还没有文件存储，点击「创建文件存储」开始"
          }
          tableLabel="文件存储列表"
          preserveTableOnEmpty
          renderRowActions={(item) => (
            <ListRowActions>
              <ListRowActionButton
                onClick={() =>
                  navigate({
                    to: "/filesystems/$filesystemId",
                    params: { filesystemId: item.id },
                  })
                }
              >
                详情
              </ListRowActionButton>
              <ListRowActionButton
                status="danger"
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
              </ListRowActionButton>
            </ListRowActions>
          )}
          pagination={{
            page,
            pageSize,
            total: filteredItems.length,
            onPageChange: setPage,
            onPageSizeChange: (next) => {
              setPageSize(next);
              setPage(1);
            },
          }}
        />
      </ListPageFrame>
      <CreateFilesystemModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
      />
    </>
  );
}
