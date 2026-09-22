import {
  getFilesystemMountCommand,
  listFilesystemMountTargets,
  type FilesystemMountTarget,
} from "@/api/storage/filesystems";
import { DataTable, StatusTag } from "@/components/common";
import { CreateFilesystemMountTargetModal } from "@/components/storage/CreateFilesystemMountTargetModal";
import { copyToClipboard } from "@/lib/clipboard";
import { formatDateTime } from "@/lib/format";
import { withId } from "@/lib/id";
import { Button, Empty } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function FilesystemMountTargets({
  filesystemId,
  onMountCountChange,
}: {
  filesystemId: string;
  onMountCountChange: (count: number) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [copyingId, setCopyingId] = useState<string>();
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
  const items = (mounts.data?.items ?? []) as FilesystemMountTarget[];
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
  const copyMountCommand = async (target: FilesystemMountTarget) => {
    setCopyingId(target.id);
    try {
      const result = await mountCommand.refetch();
      if (!result.isSuccess || !result.data.command) return;
      const command =
        result.data.ip_address && result.data.ip_address !== target.ip_address
          ? result.data.command.replace(result.data.ip_address, target.ip_address)
          : result.data.command;
      await copyToClipboard(command, "挂载命令");
    } finally {
      setCopyingId(undefined);
    }
  };

  useEffect(() => {
    onMountCountChange(items.length);
  }, [items.length, onMountCountChange]);

  return (
    <>
      <div>
        <DataTable<FilesystemMountTarget>
          header={{
            title: "挂载点",
            extra: (
              <Button type="primary" onClick={() => setVisible(true)}>
                创建挂载点
              </Button>
            ),
          }}
          columns={[
            { title: "挂载地址", dataIndex: "ip_address", width: 100, fixed: "left" },
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
          data={items}
          loading={mounts.isLoading}
          pagination={false}
          rowActions={[
            {
              key: "copy-mount-command",
              label: "复制挂载命令",
              disabled: (row) => row.status !== "available" || mountCommand.isFetching,
              loading: (row) => copyingId === row.id,
              onClick: copyMountCommand,
            },
          ]}
          noDataElement={<Empty description="暂无挂载目标，请创建挂载目标后获取访问地址" />}
        />
      </div>
      {visible && (
        <CreateFilesystemMountTargetModal
          filesystemId={filesystemId}
          onCancel={() => setVisible(false)}
        />
      )}
    </>
  );
}
