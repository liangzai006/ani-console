import { deleteFilesystem, getFilesystem, type StorageFilesystem } from "@/api/storage/filesystems";
import {
  AliIcon,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
  StatusTag,
} from "@/components/common";
import { withId } from "@/lib/id";
import { Button, Dropdown, Menu, Modal, Tooltip } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { ExpandFilesystemModal } from "@/components/storage/ExpandFilesystemModal";
import { formatDateTime } from "@/lib/format";
import { FilesystemMountTargets } from "./FilesystemMountTargets";

type Filesystem = StorageFilesystem;

export function FilesystemDetailPage({ filesystemId }: { filesystemId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expandVisible, setExpandVisible] = useState(false);
  const [mountCount, setMountCount] = useState(0);
  const handleMountCountChange = useCallback((count: number) => setMountCount(count), []);
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
            fields: [{ label: "挂载点", value: `${mountCount} 个` }],
          },
        ]}
        tabs={[
          {
            key: "mount-targets",
            label: "挂载点",
            content: (
              <FilesystemMountTargets
                filesystemId={filesystemId}
                onMountCountChange={handleMountCountChange}
              />
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
      {expandVisible && (
        <ExpandFilesystemModal filesystem={filesystem} onCancel={() => setExpandVisible(false)} />
      )}
    </>
  );
}
