import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceLifecycleRequest, InstanceRecord } from "@/api/instances";
import { Button, Dropdown, Menu, Message, Space, Tooltip } from "@arco-design/web-react";
import { IconDown } from "@arco-design/web-react/icon";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DataTableRowActionButton, DataTableRowActions } from "@/components/common";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { VmInstanceAttachFilesystemModal } from "./VmInstanceAttachFilesystemModal";
import { VmInstanceAttachVolumeModal } from "./VmInstanceAttachVolumeModal";
import { VmInstanceChangeSecurityGroupsModal } from "./VmInstanceChangeSecurityGroupsModal";
import { VmInstanceDeleteModal } from "./VmInstanceDeleteModal";
import { VmInstanceDetachVolumeModal } from "./VmInstanceDetachVolumeModal";
import { VmInstanceRebuildModal } from "./VmInstanceRebuildModal";
import { VmInstanceResizeModal } from "./VmInstanceResizeModal";
import { VmInstanceSnapshotModal } from "./VmInstanceSnapshotModal";
import { VmInstanceStopModal } from "./VmInstanceStopModal";

type VmInstance = InstanceRecord;
type LifecycleRequest = InstanceLifecycleRequest;
type LifecycleAction = LifecycleRequest["action"];
type ModalAction = Extract<
  LifecycleAction,
  | "resize"
  | "snapshot"
  | "attach_volume"
  | "detach_volume"
  | "attach_filesystem"
  | "change_security_groups"
>;

const BUSY_STATES = new Set<VmInstance["state"]>([
  "pending",
  "provisioning",
  "starting",
  "stopping",
  "deleting",
]);

export function VmInstanceActions({
  instance,
  onOperationSubmitted,
  display = "row",
}: {
  instance: VmInstance;
  onOperationSubmitted: (operationId: string) => void;
  display?: "row" | "detail";
}) {
  const navigate = useNavigate();
  const [modalAction, setModalAction] = useState<ModalAction>();
  const [stopVisible, setStopVisible] = useState(false);
  const [rebuildVisible, setRebuildVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const start = useMutation({
    mutationFn: async () => {
      const submitData = { action: "start" as const };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      Message.success("开机已提交");
      onOperationSubmitted(operationId);
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  const restart = useMutation({
    mutationFn: async () => {
      const submitData = { action: "restart" as const };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      Message.success("重启已提交");
      onOperationSubmitted(operationId);
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  const terminationProtection = useMutation({
    mutationFn: async (enabled: boolean) => {
      const submitData = {
        action: "set_termination_protection" as const,
        enabled,
      };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      Message.success("终止保护已更新");
      onOperationSubmitted(operationId);
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  const busy =
    BUSY_STATES.has(instance.state) ||
    start.isPending ||
    restart.isPending ||
    terminationProtection.isPending;
  const running = instance.state === "running";
  const stopped = instance.state === "stopped";
  const canStart = stopped || instance.state === "failed";
  const stable = running || stopped;
  const protectedInstance = instance.termination_protection === true;
  const consoleAvailable = running && instance.access?.console_available !== false;
  const detachableVolumes = (instance.volumes ?? []).filter(
    (volume) => volume.kind !== "root_disk" && Boolean(volume.source_ref?.trim()),
  );

  const handleMoreAction = (action: string) => {
    if (action === "console") {
      void navigate({
        to: "/vm-instances/$instanceId",
        params: { instanceId: instance.id },
        search: { tab: "terminal" },
      });
      return;
    }
    if (action === "restart") {
      restart.mutate();
      return;
    }
    if (action === "rebuild") {
      setRebuildVisible(true);
      return;
    }
    if (action === "termination_protection") {
      terminationProtection.mutate(!protectedInstance);
      return;
    }
    if (action === "delete") {
      setDeleteVisible(true);
      return;
    }
    setModalAction(action as ModalAction);
  };

  const lifecycleDisabled = canStart ? busy : !running || busy || protectedInstance;
  const lifecycleAction = () => {
    if (canStart) start.mutate();
    else setStopVisible(true);
  };
  const lifecycleButton =
    display === "row" ? (
      <DataTableRowActionButton
        disabled={lifecycleDisabled}
        title={canStart || running || protectedInstance ? undefined : "当前状态不可关机"}
        onClick={lifecycleAction}
      >
        {canStart ? "开机" : "关机"}
      </DataTableRowActionButton>
    ) : (
      <Button
        disabled={lifecycleDisabled}
        loading={start.isPending}
        title={canStart || running || protectedInstance ? undefined : "当前状态不可关机"}
        onClick={lifecycleAction}
      >
        {canStart ? "开机" : "关机"}
      </Button>
    );
  const lifecycleControl =
    protectedInstance && running ? (
      <Tooltip content="已开启终止保护，请先关闭后再关机">
        <span className="inline-flex">{lifecycleButton}</span>
      </Tooltip>
    ) : (
      lifecycleButton
    );
  const moreMenu = (
    <Menu onClickMenuItem={handleMoreAction}>
      <Menu.Item key="restart" disabled={!running || busy}>
        重启
      </Menu.Item>
      <Menu.Item key="resize" disabled={!stopped || busy}>
        变配
      </Menu.Item>
      <Menu.Item key="rebuild" disabled={!stable || busy || protectedInstance}>
        重建
      </Menu.Item>
      <Menu.Item key="snapshot" disabled={!stable || busy}>
        创建快照
      </Menu.Item>
      <Menu.Item key="attach_volume" disabled={!stable || busy}>
        挂载云盘
      </Menu.Item>
      <Menu.Item key="detach_volume" disabled={!stable || busy || detachableVolumes.length === 0}>
        卸载云盘
      </Menu.Item>
      <Menu.Item key="attach_filesystem" disabled={!stable || busy}>
        挂载 NFS
      </Menu.Item>
      <Menu.Item key="change_security_groups" disabled={!stable || busy}>
        更换安全组
      </Menu.Item>
      <Menu.Item key="termination_protection" disabled={busy}>
        {protectedInstance ? "关闭终止保护" : "开启终止保护"}
      </Menu.Item>
      <Menu.Item key="console" disabled={!consoleAvailable}>
        远程连接
      </Menu.Item>
      <Menu.Item
        key="delete"
        disabled={busy || protectedInstance}
        style={{ color: "var(--color-danger-6)" }}
      >
        删除
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      {display === "row" ? (
        <DataTableRowActions>
          {lifecycleControl}
          <Dropdown trigger="click" position="br" droplist={moreMenu}>
            <DataTableRowActionButton disabled={busy}>
              更多
              <IconDown />
            </DataTableRowActionButton>
          </Dropdown>
        </DataTableRowActions>
      ) : (
        <Space>
          {lifecycleControl}
          <Dropdown trigger="click" position="br" droplist={moreMenu}>
            <Button disabled={busy}>
              更多操作
              <IconDown className="ml-1 text-xs" />
            </Button>
          </Dropdown>
        </Space>
      )}

      {stopVisible && (
        <VmInstanceStopModal
          instance={instance}
          onCancel={() => setStopVisible(false)}
          onSubmitted={(operationId) => {
            setStopVisible(false);
            onOperationSubmitted(operationId);
          }}
        />
      )}
      {rebuildVisible && (
        <VmInstanceRebuildModal
          instance={instance}
          onCancel={() => setRebuildVisible(false)}
          onSubmitted={(operationId) => {
            setRebuildVisible(false);
            onOperationSubmitted(operationId);
          }}
        />
      )}
      {deleteVisible && (
        <VmInstanceDeleteModal
          instance={instance}
          onCancel={() => setDeleteVisible(false)}
          onSubmitted={(operationId) => {
            setDeleteVisible(false);
            onOperationSubmitted(operationId);
          }}
        />
      )}
      {modalAction === "resize" && (
        <VmInstanceResizeModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={(operationId) => {
            setModalAction(undefined);
            onOperationSubmitted(operationId);
          }}
        />
      )}
      {modalAction === "snapshot" && (
        <VmInstanceSnapshotModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={(operationId) => {
            setModalAction(undefined);
            onOperationSubmitted(operationId);
          }}
        />
      )}
      {modalAction === "attach_volume" && (
        <VmInstanceAttachVolumeModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={(operationId) => {
            setModalAction(undefined);
            onOperationSubmitted(operationId);
          }}
        />
      )}
      {modalAction === "detach_volume" && (
        <VmInstanceDetachVolumeModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={(operationId) => {
            setModalAction(undefined);
            onOperationSubmitted(operationId);
          }}
        />
      )}
      {modalAction === "attach_filesystem" && (
        <VmInstanceAttachFilesystemModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={(operationId) => {
            setModalAction(undefined);
            onOperationSubmitted(operationId);
          }}
        />
      )}
      {modalAction === "change_security_groups" && (
        <VmInstanceChangeSecurityGroupsModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={(operationId) => {
            setModalAction(undefined);
            onOperationSubmitted(operationId);
          }}
        />
      )}
    </>
  );
}
