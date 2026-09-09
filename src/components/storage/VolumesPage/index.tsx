import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { CreateVolumeModal } from "@/components/storage/CreateVolumeModal";
import { CreateVolumeSnapshotModal } from "@/components/storage/CreateVolumeSnapshotModal";
import { ExpandVolumeModal } from "@/components/storage/ExpandVolumeModal";
import { AttachVolumeModal } from "@/components/storage/AttachVolumeModal";
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
import { formatDateTime } from "@/lib/format";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

type Volume = components["schemas"]["StorageVolume"];
type StatusFilter = "all" | "available" | "mounted" | "failed";
type SearchField = "name" | "id";

export function VolumesPage() {
  const qc = useQueryClient();
  const detachScope = useIdempotencyScope("storage-volume-detach", ["POST"]);
  const [createVisible, setCreateVisible] = useState(false);
  const [attachTarget, setAttachTarget] = useState<Volume | null>(null);
  const [expandTarget, setExpandTarget] = useState<Volume | null>(null);
  const [snapshotTarget, setSnapshotTarget] = useState<Volume | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const {
    query: volumes,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  } = useCursorPaginatedQuery<Volume>({
    queryKey: ["volumes", { status, searchField, searchText }],
    cursorScope: `${status}:${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      const keyword = searchText.trim();
      const { data, error } = await coreApi.GET("/volumes", {
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
      if (error || !data) throw error ?? new Error("块存储卷列表未返回结果");
      return data;
    },
  });
  const deleteVolume = useMutation({
    mutationFn: async (item: Volume) => {
      const { error } = await coreApi.DELETE("/volumes/{volume_id}", {
        params: { path: { volume_id: item.id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      resetPagination();
      void qc.invalidateQueries({ queryKey: ["volumes"] });
    },
    onError: (error) => showApiError(error),
  });
  const detachVolume = useMutation({
    mutationFn: async (item: Volume) => {
      if (!item.mount_instance_id) throw new Error("块存储卷未挂载实例");
      const submitData = {
        action: "detach_volume" as const,
        volume_id: item.id,
      };
      const { error } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
        params: { path: { instance_id: item.mount_instance_id } },
        body: detachScope.withKey(submitData, [item.mount_instance_id, item.id]),
      });
      if (error) throw error;
    },
    onSuccess: (_data, item) => {
      detachScope.reset([item.mount_instance_id, item.id]);
      void qc.invalidateQueries({ queryKey: ["instances"] });
      void qc.invalidateQueries({ queryKey: ["volume", item.id] });
      void qc.invalidateQueries({ queryKey: ["volumes"] });
    },
    onError: (error) => showApiError(error),
  });
  const items = useMemo(() => (volumes.data?.items ?? []) as Volume[], [volumes.data?.items]);
  const isMounted = (item: Volume) => Boolean(item.mount_instance_id);
  const paginationTotal = volumes.data?.total ?? items.length;
  useListErrorNotification({
    id: "volumes-list",
    title: "块存储卷列表加载失败",
    error: volumes.error,
  });

  const columns: Array<ListColumn<Volume>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <DataTableNameCell
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
      render: (_, item) => <StatusTag status={item.state} />,
    },
    {
      key: "size",
      title: "容量 (GiB)",
      dataIndex: "size_gib",
    },
    {
      key: "storageClass",
      title: "类型",
      dataIndex: "storage_class",
    },
    {
      key: "encrypted",
      title: "加密",
      render: (_, item) => (item.encrypted ? "是" : "否"),
    },
    {
      key: "zone",
      title: "可用区",
      dataIndex: "zone",
      placeholder: "-",
    },
    {
      key: "mountInstance",
      title: "挂载实例",
      render: (_, item) => item.mount_name ?? item.mount_instance_id ?? "-",
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
              { value: "all", label: "全部" },
              { value: "available", label: "可用" },
              { value: "mounted", label: "已挂载" },
              { value: "failed", label: "异常" },
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
                  {isMounted(item) ? (
                    <DataTableRowActionButton
                      loading={detachVolume.isPending && detachVolume.variables?.id === item.id}
                      onClick={() =>
                        Modal.confirm({
                          title: "卸载块存储卷",
                          content: `确定从「${item.mount_name ?? item.mount_instance_id}」卸载「${item.name}」？请先确保实例内没有进程正在读写该卷。`,
                          okButtonProps: { status: "danger" },
                          onOk: () => detachVolume.mutateAsync(item),
                        })
                      }
                    >
                      卸载
                    </DataTableRowActionButton>
                  ) : (
                    <DataTableRowActionButton onClick={() => setAttachTarget(item)}>
                      挂载
                    </DataTableRowActionButton>
                  )}
                  <DataTableRowActionButton onClick={() => setExpandTarget(item)}>
                    扩容
                  </DataTableRowActionButton>
                  <DataTableRowActionButton onClick={() => setSnapshotTarget(item)}>
                    创建快照
                  </DataTableRowActionButton>
                  <DataTableRowActionButton
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
                  </DataTableRowActionButton>
                </DataTableRowActions>
              ),
            },
          ]}
          loading={volumes.isFetching}
          emptyIconClassName="icon-kuaicunchu"
          emptyText={
            searchText || status !== "all"
              ? "没有符合条件的块存储卷"
              : "还没有块存储卷，点击「创建卷」开始"
          }
          tableLabel="块存储卷列表"
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
      <CreateVolumeModal visible={createVisible} onCancel={() => setCreateVisible(false)} />
      <AttachVolumeModal
        visible={Boolean(attachTarget)}
        volumeId={attachTarget?.id ?? ""}
        onCancel={() => setAttachTarget(null)}
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
