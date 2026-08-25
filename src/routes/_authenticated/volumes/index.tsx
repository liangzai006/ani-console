import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@arco-design/web-react";
import { useEffect, useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { CreateVolumeModal } from "@/components/storage/CreateVolumeModal";
import { CreateVolumeSnapshotModal } from "@/components/storage/CreateVolumeSnapshotModal";
import { ExpandVolumeModal } from "@/components/storage/ExpandVolumeModal";
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

type Volume = components["schemas"]["StorageVolume"];
type StatusFilter = "all" | "available" | "mounted" | "failed";
type SearchField = "name" | "id";

export const Route = createFileRoute("/_authenticated/volumes/")({
  component: VolumesPage,
});

function VolumesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const [expandTarget, setExpandTarget] = useState<Volume | null>(null);
  const [snapshotTarget, setSnapshotTarget] = useState<Volume | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const volumes = useQuery({
    queryKey: ["volumes"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/volumes", { params: { query: { limit: 100 } } }),
      ),
  });
  const deleteVolume = useMutation({
    mutationFn: async (item: Volume) => {
      const { error } = await coreApi.DELETE("/volumes/{volume_id}", {
        params: { path: { volume_id: item.id } },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["volumes"] }),
    onError: (error) => showApiError(error),
  });
  const items = (volumes.data?.items ?? []) as Volume[];
  const isMounted = (item: Volume) => Boolean(item.mount_instance_id);
  const statusCounts = useMemo(
    () => ({
      all: items.length,
      available: items.filter(
        (item) => item.state === "available" && !isMounted(item),
      ).length,
      mounted: items.filter((item) => isMounted(item)).length,
      failed: items.filter((item) => item.state === "failed").length,
    }),
    [items],
  );
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return items.filter((item) => {
      if (
        status === "available" &&
        !(item.state === "available" && !isMounted(item))
      )
        return false;
      if (status === "mounted" && !isMounted(item)) return false;
      if (status === "failed" && item.state !== "failed") return false;
      return (
        !keyword || String(item[searchField]).toLowerCase().includes(keyword)
      );
    });
  }, [items, searchField, searchText, status]);
  const pagedItems = filteredItems.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  useEffect(() => setPage(1), [searchField, searchText, status]);

  const columns: Array<ListColumn<Volume>> = [
    {
      key: "name",
      title: "名称 / ID",
      minWidth: 240,
      render: (item) => (
        <ListNameCell
          name={
            <Link to="/volumes/$volumeId" params={{ volumeId: item.id }}>
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
      key: "size",
      title: "容量 (GiB)",
      width: 110,
      render: (item) => item.size_gib,
    },
    {
      key: "storageClass",
      title: "类型",
      minWidth: 150,
      render: (item) => item.storage_class,
    },
    {
      key: "encrypted",
      title: "加密",
      width: 90,
      render: (item) => (item.encrypted ? "是" : "否"),
    },
    {
      key: "zone",
      title: "可用区",
      minWidth: 120,
      render: (item) => item.zone ?? "—",
    },
    {
      key: "mountInstance",
      title: "挂载实例",
      minWidth: 180,
      render: (item) => item.mount_name ?? item.mount_instance_id ?? "—",
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
            iconClassName="icon-kuaicunchu"
            title="块存储"
            subtitle="管理可挂载到实例的块存储卷及快照"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setCreateVisible(true)}
              >
                创建卷
              </ToolbarButton>
            }
          />
        }
        tabs={
          <StatusTabs
            value={status}
            onChange={setStatus}
            items={[
              { value: "all", label: "全部", count: statusCounts.all },
              {
                value: "available",
                label: "可用",
                count: statusCounts.available,
              },
              {
                value: "mounted",
                label: "已挂载",
                count: statusCounts.mounted,
              },
              { value: "failed", label: "异常", count: statusCounts.failed },
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
                spinning={volumes.isFetching}
                onClick={() => void volumes.refetch()}
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
          loading={volumes.isLoading}
          error={
            volumes.error
              ? getErrorMessage(volumes.error, "块存储卷列表加载失败")
              : null
          }
          onRetry={() => void volumes.refetch()}
          emptyIconClassName="icon-kuaicunchu"
          emptyText={
            searchText || status !== "all"
              ? "没有符合条件的块存储卷"
              : "还没有块存储卷，点击「创建卷」开始"
          }
          tableLabel="块存储卷列表"
          preserveTableOnEmpty
          renderRowActions={(item) => (
            <ListRowActions>
              <ListRowActionButton
                onClick={() =>
                  navigate({
                    to: "/volumes/$volumeId",
                    params: { volumeId: item.id },
                  })
                }
              >
                详情
              </ListRowActionButton>
              <ListRowActionButton onClick={() => setExpandTarget(item)}>
                扩容
              </ListRowActionButton>
              <ListRowActionButton onClick={() => setSnapshotTarget(item)}>
                创建快照
              </ListRowActionButton>
              <ListRowActionButton
                status="danger"
                onClick={() =>
                  Modal.confirm({
                    title: "删除块存储卷",
                    content: `确定删除「${item.name}」？卷被实例挂载时无法删除。`,
                    okButtonProps: { status: "danger" },
                    onOk: () => deleteVolume.mutateAsync(item),
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
      <CreateVolumeModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
      />
      <ExpandVolumeModal
        visible={Boolean(expandTarget)}
        volume={expandTarget}
        onCancel={() => setExpandTarget(null)}
      />
      <CreateVolumeSnapshotModal
        visible={Boolean(snapshotTarget)}
        volumeId={snapshotTarget?.id ?? ""}
        onCancel={() => setSnapshotTarget(null)}
      />
    </>
  );
}
