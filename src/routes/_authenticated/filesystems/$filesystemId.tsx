import {
  DataTable,
  DetailPageFrame,
  DetailPagePlaceholder,
  AliIcon,
  StatusTag,
} from '@/components/common'
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert, Button, Empty, Modal, Space, Spin, Tooltip } from "@arco-design/web-react"
import { coreApi } from "@/api/client";
import { useState } from "react";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { CreateFilesystemMountTargetModal } from "@/components/storage/CreateFilesystemMountTargetModal";
import { ExpandFilesystemModal } from "@/components/storage/ExpandFilesystemModal";
import { FilesystemPermissionsTab } from "@/components/storage/FilesystemPermissionsTab";
import { listOrThrow } from "@/lib/api-list";
import { formatDateTime } from "@/lib/format";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";

type Filesystem = components["schemas"]["StorageFilesystem"];
type MountTarget = components["schemas"]["FilesystemMountTarget"];

export const Route = createFileRoute(
  "/_authenticated/filesystems/$filesystemId",
)({ component: FilesystemDetailPage });

function FilesystemDetailPage() {
  const { filesystemId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expandVisible, setExpandVisible] = useState(false);
  const [mountTargetVisible, setMountTargetVisible] = useState(false);
  const detail = useQuery({
    queryKey: ["filesystem", filesystemId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET(
        "/filesystems/{filesystem_id}",
        { params: { path: { filesystem_id: filesystemId } } },
      );
      if (error) throw error;
      return data;
    },
  });
  useListErrorNotification({
    id: `filesystem-detail:${filesystemId}`,
    title: "文件存储加载失败",
    error: detail.error,
  });
  const mounts = useQuery({
    queryKey: ["filesystem-mounts", filesystemId],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/filesystems/{filesystem_id}/mount-targets", {
          params: {
            path: { filesystem_id: filesystemId },
            query: { limit: 100 },
          },
        }),
      ),
  });
  useListErrorNotification({
    id: `filesystem-mounts:${filesystemId}`,
    title: "挂载目标加载失败",
    error: mounts.error,
  });
  const remove = useMutation({
    mutationFn: async (_: undefined) => {
      const { error } = await coreApi.DELETE("/filesystems/{filesystem_id}", {
        params: { path: { filesystem_id: filesystemId } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filesystems"] });
      navigate({ to: "/filesystems" });
    },
    onError: (error) => showApiError(error),
  });
  if (detail.isLoading && !detail.data)
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    );
  if (!detail.data)
    return (
      <DetailPagePlaceholder
        breadcrumbs={[{ label: "存储" }, { label: "文件存储", to: "/filesystems" }, { label: filesystemId }]}
        title={filesystemId}
        idLabel="文件系统 ID"
        idValue={filesystemId}
        iconName="wenjiancunchu"
      />
    );

  const filesystem = detail.data as Filesystem;
  const mountItems = (mounts.data?.items ?? []) as MountTarget[];
  const unavailable = (description: string) => (
    <Empty description={description} />
  );
  const filesystemStatus = filesystem.reason ? (
    <Tooltip content={filesystem.reason}>
      <span className="inline-flex">
        <StatusTag status={filesystem.state} />
      </span>
    </Tooltip>
  ) : (
    <StatusTag status={filesystem.state} />
  );

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "存储" },
          { label: "文件存储", to: "/filesystems" },
          { label: filesystem.name },
        ]}
        title={filesystem.name}
        status={filesystemStatus}
        icon={<AliIcon name="wenjiancunchu" size={28} />}
        headerItems={[
          { label: "文件系统 ID", value: filesystem.id },
          { label: "容量 (GiB)", value: filesystem.size_gib },
          { label: "创建时间", value: formatDateTime(filesystem.created_at) },
        ]}
        actions={
          <Space>
            <Button onClick={() => setExpandVisible(true)}>扩容</Button>
            <Button
              status="danger"
              loading={remove.isPending}
              onClick={() =>
                Modal.confirm({
                  title: "删除文件存储",
                  content: `确定删除「${filesystem.name}」？请先卸载所有客户端并确认没有业务正在访问。`,
                  okButtonProps: { status: "danger" },
                  onOk: () => remove.mutateAsync(undefined),
                })
              }
            >
              删除
            </Button>
          </Space>
        }
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [
              { label: "ID", value: filesystem.id },
              { label: "名称", value: filesystem.name },
              { label: "状态", value: filesystemStatus },
              { label: "协议", value: filesystem.protocol.toUpperCase() },
              {
                label: "性能模式",
                value:
                  filesystem.performance_mode === "standard"
                    ? "标准型"
                    : filesystem.performance_mode === "throughput"
                      ? "吞吐型"
                      : "—",
              },
              { label: "容量 (GiB)", value: filesystem.size_gib },
              {
                label: "创建时间",
                value: formatDateTime(filesystem.created_at),
              },
              {
                label: "更新时间",
                value: formatDateTime(filesystem.updated_at),
              },
            ],
          },
          {
            key: "related-summary",
            title: "关联摘要",
            fields: mountItems.length
              ? [
                  { label: "挂载目标", value: `${mountItems.length} 个` },
                  {
                    label: "可用挂载目标",
                    value: `${mountItems.filter((item) => item.status === "available").length} 个`,
                  },
                ]
              : [{ label: "暂无挂载目标", value: "—" }],
          },
        ]}
        tabs={[
          {
            key: "mount-targets",
            label: "挂载目标",
            extra: (
              <Button
                type="primary"
                onClick={() => setMountTargetVisible(true)}
              >
                创建挂载目标
              </Button>
            ),
            content: (
              <DataTable<MountTarget>
                columns={[
                  { title: "挂载目标 ID", dataIndex: "id" },
                  {
                    title: "状态",
                    width: 120,
                    render: (_, row) => <StatusTag status={row.status} />,
                  },
                  {
                    title: "VPC",
                    render: (_, row) =>
                      row.vpc_id ? (
                        <Link
                          to="/networks/vpcs/$vpcId"
                          params={{ vpcId: row.vpc_id }}
                        >
                          {row.vpc_id}
                        </Link>
                      ) : (
                        "—"
                      ),
                  },
                  {
                    title: "子网",
                    render: (_, row) => (
                      <Link
                        to="/networks/subnets/$subnetId"
                        params={{ subnetId: row.subnet_id }}
                      >
                        {row.subnet_id}
                      </Link>
                    ),
                  },
                  { title: "IP 地址", dataIndex: "ip_address" },
                  {
                    title: "创建时间",
                    render: (_, row) => formatDateTime(row.created_at),
                  },
                ]}
                data={mountItems}
                loading={mounts.isLoading}
                pagination={false}
                noDataElement={
                  <Empty description="暂无挂载目标，请创建挂载目标后获取访问地址" />
                }
              />
            ),
          },
          {
            key: "permissions",
            label: "权限",
            content: <FilesystemPermissionsTab />,
          },
          {
            key: "events",
            label: "事件",
            content: (
              <Space direction="vertical" size={12} className="w-full">
                {filesystem.reason ? (
                  <Alert type="warning" showIcon content={filesystem.reason} />
                ) : null}
                {unavailable("当前 Core API 暂未提供文件存储事件列表")}
              </Space>
            ),
          },
        ]}
        onBack={() => navigate({ to: "/filesystems" })}
      />
      <CreateFilesystemMountTargetModal
        visible={mountTargetVisible}
        filesystemId={filesystem.id}
        onCancel={() => setMountTargetVisible(false)}
      />
      <ExpandFilesystemModal
        visible={expandVisible}
        filesystem={filesystem}
        onCancel={() => setExpandVisible(false)}
      />
    </>
  );
}
