import {
  deleteFilesystem,
  getFilesystem,
  getFilesystemMountCommand,
  listFilesystemMountTargets,
  type FilesystemMountTarget,
  type StorageFilesystem,
} from "@/api/storage/filesystems";
import {
  AliIcon,
  DataTable,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
  StatusTag,
  TableSectionHeader,
} from "@/components/common";
import { withId } from "@/lib/id";
import { Button, Dropdown, Empty, Menu, Modal, Tooltip } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { CreateFilesystemMountTargetModal } from "@/components/storage/CreateFilesystemMountTargetModal";
import { ExpandFilesystemModal } from "@/components/storage/ExpandFilesystemModal";
import { copyToClipboard } from "@/lib/clipboard";
import { formatDateTime } from "@/lib/format";

type Filesystem = StorageFilesystem;
type MountTarget = FilesystemMountTarget;

export function FilesystemDetailPage({ filesystemId }: { filesystemId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expandVisible, setExpandVisible] = useState(false);
  const [mountTargetVisible, setMountTargetVisible] = useState(false);
  const [copyingMountTargetId, setCopyingMountTargetId] = useState<string>();
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("filesystem", filesystemId),
        action: "文件存储加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["filesystem", filesystemId],
    queryFn: () => getFilesystem(filesystemId),
  });
  const mounts = useQuery({
    meta: {
      errorNotification: {
        id: withId("filesystem-mounts", filesystemId),
        action: "挂载点加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["filesystem-mounts", filesystemId],
    queryFn: () => listFilesystemMountTargets(filesystemId, { limit: 100 }),
  });
  const mountCommand = useQuery({
    meta: {
      errorNotification: {
        id: withId("filesystem-mount-command", filesystemId),
        action: "挂载命令获取",
        fallback: "挂载命令获取失败",
      },
    },
    queryKey: ["filesystem-mount-command", filesystemId],
    queryFn: () => getFilesystemMountCommand(filesystemId),
    enabled: false,
  });
  const remove = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "filesystem-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (_: undefined) => deleteFilesystem(filesystemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filesystems"] });
      navigate({ to: "/filesystems" });
    },
  });
  if (!detail.data) return <DetailPagePlaceholder loading={detail.isLoading} />;

  const filesystem = detail.data as Filesystem;
  const mountItems = (mounts.data?.items ?? []) as MountTarget[];
  // const unavailable = (description: string) => <Empty description={description} />;
  const filesystemStatus = filesystem.reason ? (
    <Tooltip content={filesystem.reason}>
      <span className="inline-flex">
        <StatusTag status={filesystem.state} />
      </span>
    </Tooltip>
  ) : (
    <StatusTag status={filesystem.state} />
  );
  const handleMoreAction = (action: string) => {
    if (action === "expand") {
      setExpandVisible(true);
      return;
    }
    if (action === "delete") {
      Modal.confirm({
        title: "删除文件存储",
        content: `确定删除「${filesystem.name}」？请先卸载所有客户端并确认没有业务正在访问。`,
        okButtonProps: { status: "danger" },
        onOk: () => remove.mutateAsync(undefined),
      });
    }
  };
  const moreMenu = (
    <Menu onClickMenuItem={handleMoreAction}>
      <Menu.Item key="expand">扩容</Menu.Item>
      <Menu.Item
        key="delete"
        disabled={remove.isPending}
        style={{ color: "var(--color-danger-6)" }}
      >
        删除
      </Menu.Item>
    </Menu>
  );
  const copyMountCommand = async (target: MountTarget) => {
    setCopyingMountTargetId(target.id);
    try {
      const result = await mountCommand.refetch();
      if (!result.isSuccess || !result.data.command) return;
      // 接口返回文件系统级命令；列表操作需保留服务端协议和路径，仅替换为当前行挂载点 IP。
      const command =
        result.data.ip_address && result.data.ip_address !== target.ip_address
          ? result.data.command.replace(result.data.ip_address, target.ip_address)
          : result.data.command;
      await copyToClipboard(command, "挂载命令");
    } finally {
      setCopyingMountTargetId(undefined);
    }
  };

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
          { label: "容量 (GiB)", value: String(filesystem.size_gib) },
          { label: "创建时间", value: formatDateTime(filesystem.created_at) },
        ]}
        actions={
          <Dropdown trigger="click" position="br" droplist={moreMenu}>
            <Button disabled={remove.isPending} aria-label="更多操作" title="更多操作">
              <IconMoreVertical />
            </Button>
          </Dropdown>
        }
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [
              { label: "ID", value: <ResourceId value={filesystem.id} /> },
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
                      : "-",
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
            fields: [{ label: "挂载点", value: `${mountItems.length} 个` }],
          },
        ]}
        tabs={[
          {
            key: "mount-targets",
            label: "挂载点",
            content: (
              <div>
                <TableSectionHeader
                  title="挂载点"
                  extra={
                    <Button type="primary" onClick={() => setMountTargetVisible(true)}>
                      创建挂载点
                    </Button>
                  }
                />
                <DataTable<MountTarget>
                  columns={[
                    { title: "挂载地址", dataIndex: "ip_address", width: 100, fixed: "left" },
                    // { title: "挂载目标 ID", dataIndex: "id" },
                    {
                      title: "状态",
                      width: 120,
                      render: (_, row) => <StatusTag status={row.status} />,
                    },
                    {
                      title: "VPC",
                      width: 200,
                      ellipsis: true,
                      dataIndex: "vpc_id",
                      placeholder: "-",
                    },
                    {
                      title: "子网",
                      width: 200,
                      ellipsis: true,
                      dataIndex: "subnet_id",
                      placeholder: "-",
                    },
                    {
                      title: "创建时间",
                      width: 200,
                      render: (_, row) => formatDateTime(row.created_at),
                    },
                  ]}
                  data={mountItems}
                  loading={mounts.isLoading}
                  pagination={false}
                  rowActions={[
                    {
                      key: "copy-mount-command",
                      label: "复制挂载命令",
                      disabled: (row) => row.status !== "available" || mountCommand.isFetching,
                      loading: (row) => copyingMountTargetId === row.id,
                      onClick: copyMountCommand,
                    },
                  ]}
                  noDataElement={<Empty description="暂无挂载目标，请创建挂载目标后获取访问地址" />}
                />
              </div>
            ),
          },
          // {
          //   key: "events",
          //   label: "事件",
          //   content: (
          //     <Space direction="vertical" size={12} className="w-full">
          //       {unavailable("当前 Core API 暂未提供文件存储事件列表")}
          //     </Space>
          //   ),
          // },
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
