import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceLifecycleRequest, InstanceRecord } from "@/api/instances";
import type { RowAction } from "@/components/common";
import { Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { VmInstanceAttachFilesystemModal } from "../../VmInstanceActions/VmInstanceAttachFilesystemModal";
import { VmInstanceAttachVolumeModal } from "../../VmInstanceActions/VmInstanceAttachVolumeModal";
import { VmInstanceChangeSecurityGroupsModal } from "../../VmInstanceActions/VmInstanceChangeSecurityGroupsModal";
import { VmInstanceDetachVolumeModal } from "../../VmInstanceActions/VmInstanceDetachVolumeModal";
import { VmInstanceRebuildModal } from "../../VmInstanceActions/VmInstanceRebuildModal";
import { VmInstanceResizeModal } from "../../VmInstanceActions/VmInstanceResizeModal";
import { VmInstanceSnapshotModal } from "../../VmInstanceActions/VmInstanceSnapshotModal";
import { VmInstanceStopModal } from "../../VmInstanceActions/VmInstanceStopModal";

type VmInstance = InstanceRecord;
type LifecycleAction = InstanceLifecycleRequest["action"];
type ModalAction = Extract<
  LifecycleAction,
  | "resize"
  | "snapshot"
  | "attach_volume"
  | "detach_volume"
  | "attach_filesystem"
  | "change_security_groups"
>;
type DialogAction = "stop" | "rebuild" | ModalAction;
type DialogState = { action: DialogAction; instance: VmInstance };

const BUSY_STATES = new Set<VmInstance["state"]>([
  "pending",
  "provisioning",
  "starting",
  "stopping",
  "deleting",
]);

export function useVmInstanceRowActions({
  onOperationSubmitted,
}: {
  onOperationSubmitted: (operationId: string) => void;
}) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<DialogState>();
  const start = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "vm-start",
        action: "操作",
        successText: "开机已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (instance: VmInstance) => {
      const data = await applyInstanceLifecycle(instance.id, { action: "start" });
      return data.operation_id;
    },
    onSuccess: onOperationSubmitted,
  });
  const restart = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "vm-restart",
        action: "操作",
        successText: "重启已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (instance: VmInstance) => {
      const data = await applyInstanceLifecycle(instance.id, { action: "restart" });
      return data.operation_id;
    },
    onSuccess: onOperationSubmitted,
  });
  const terminationProtection = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "vm-protection",
        action: "操作",
        successText: "终止保护已更新",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async ({ instance, enabled }: { instance: VmInstance; enabled: boolean }) => {
      const data = await applyInstanceLifecycle(instance.id, {
        action: "set_termination_protection",
        enabled,
      });
      return data.operation_id;
    },
    onSuccess: onOperationSubmitted,
  });
  const remove = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "vm-delete",
        action: "操作",
        successText: "删除已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (instance: VmInstance) => {
      const data = await applyInstanceLifecycle(instance.id, { action: "delete" });
      return data.operation_id;
    },
    onSuccess: onOperationSubmitted,
  });

  const isPendingFor = (instance: VmInstance) =>
    (start.isPending && start.variables?.id === instance.id) ||
    (restart.isPending && restart.variables?.id === instance.id) ||
    (terminationProtection.isPending &&
      terminationProtection.variables?.instance.id === instance.id) ||
    (remove.isPending && remove.variables?.id === instance.id);
  const isBusy = (instance: VmInstance) =>
    BUSY_STATES.has(instance.state) || isPendingFor(instance);
  const isRunning = (instance: VmInstance) => instance.state === "running";
  const isStopped = (instance: VmInstance) => instance.state === "stopped";
  const canStart = (instance: VmInstance) => isStopped(instance) || instance.state === "failed";
  const isStable = (instance: VmInstance) => isRunning(instance) || isStopped(instance);
  const isProtected = (instance: VmInstance) => instance.termination_protection === true;
  const hasDetachableVolume = (instance: VmInstance) =>
    (instance.volumes ?? []).some(
      (volume) => volume.kind !== "root_disk" && Boolean(volume.source_ref?.trim()),
    );

  const rowActions: Array<RowAction<VmInstance>> = [
    {
      key: "lifecycle",
      label: (instance) => (canStart(instance) ? "开机" : "关机"),
      widthLabel: "关机",
      disabled: (instance) =>
        canStart(instance)
          ? isBusy(instance)
          : !isRunning(instance) || isBusy(instance) || isProtected(instance),
      loading: (instance) => start.isPending && start.variables?.id === instance.id,
      tooltip: (instance) =>
        isProtected(instance) && isRunning(instance)
          ? "已开启终止保护，请先关闭后再关机"
          : undefined,
      onClick: (instance) => {
        if (canStart(instance)) return start.mutateAsync(instance);
        setDialog({ action: "stop", instance });
      },
    },
    {
      key: "restart",
      label: "重启",
      disabled: (instance) => !isRunning(instance) || isBusy(instance),
      loading: (instance) => restart.isPending && restart.variables?.id === instance.id,
      onClick: (instance) => restart.mutateAsync(instance),
    },
    {
      key: "resize",
      label: "变配",
      disabled: (instance) => !isStopped(instance) || isBusy(instance),
      onClick: (instance) => setDialog({ action: "resize", instance }),
    },
    {
      key: "rebuild",
      label: "重建",
      disabled: (instance) => !isStable(instance) || isBusy(instance) || isProtected(instance),
      onClick: (instance) => setDialog({ action: "rebuild", instance }),
    },
    {
      key: "snapshot",
      label: "创建快照",
      disabled: (instance) => !isStable(instance) || isBusy(instance),
      onClick: (instance) => setDialog({ action: "snapshot", instance }),
    },
    {
      key: "attach-volume",
      label: "挂载云盘",
      disabled: (instance) => !isStable(instance) || isBusy(instance),
      onClick: (instance) => setDialog({ action: "attach_volume", instance }),
    },
    {
      key: "detach-volume",
      label: "卸载云盘",
      disabled: (instance) =>
        !isStable(instance) || isBusy(instance) || !hasDetachableVolume(instance),
      onClick: (instance) => setDialog({ action: "detach_volume", instance }),
    },
    {
      key: "attach-filesystem",
      label: "挂载 NFS",
      disabled: (instance) => !isStable(instance) || isBusy(instance),
      onClick: (instance) => setDialog({ action: "attach_filesystem", instance }),
    },
    {
      key: "change-security-groups",
      label: "更换安全组",
      disabled: (instance) => !isStable(instance) || isBusy(instance),
      onClick: (instance) => setDialog({ action: "change_security_groups", instance }),
    },
    {
      key: "termination-protection",
      label: (instance) => (isProtected(instance) ? "关闭终止保护" : "开启终止保护"),
      widthLabel: "关闭终止保护",
      disabled: isBusy,
      loading: (instance) =>
        terminationProtection.isPending &&
        terminationProtection.variables?.instance.id === instance.id,
      onClick: (instance) =>
        terminationProtection.mutateAsync({ instance, enabled: !isProtected(instance) }),
    },
    {
      key: "console",
      label: "远程连接",
      disabled: (instance) => !isRunning(instance) || instance.access?.console_available === false,
      onClick: (instance) =>
        navigate({
          to: "/vm-instances/$instanceId",
          params: { instanceId: instance.id },
          search: { tab: "terminal" },
        }),
    },
    {
      key: "delete",
      label: "删除",
      intent: "danger",
      disabled: (instance) => isBusy(instance) || isProtected(instance),
      loading: (instance) => remove.isPending && remove.variables?.id === instance.id,
      onClick: (instance) =>
        void Modal.confirm({
          title: "删除云主机",
          content: `确定删除「${instance.name}」？删除后资源不可恢复。`,
          okButtonProps: { status: "danger" },
          onOk: () => remove.mutateAsync(instance),
        }),
    },
  ];

  const closeDialog = () => setDialog(undefined);
  const onDialogSubmitted = (operationId: string) => {
    closeDialog();
    onOperationSubmitted(operationId);
  };
  const dialogNode = dialog ? (
    dialog.action === "stop" ? (
      <VmInstanceStopModal
        instance={dialog.instance}
        onCancel={closeDialog}
        onSubmitted={onDialogSubmitted}
      />
    ) : dialog.action === "rebuild" ? (
      <VmInstanceRebuildModal
        instance={dialog.instance}
        onCancel={closeDialog}
        onSubmitted={onDialogSubmitted}
      />
    ) : dialog.action === "resize" ? (
      <VmInstanceResizeModal
        instance={dialog.instance}
        onCancel={closeDialog}
        onSubmitted={onDialogSubmitted}
      />
    ) : dialog.action === "snapshot" ? (
      <VmInstanceSnapshotModal
        instance={dialog.instance}
        onCancel={closeDialog}
        onSubmitted={onDialogSubmitted}
      />
    ) : dialog.action === "attach_volume" ? (
      <VmInstanceAttachVolumeModal
        instance={dialog.instance}
        onCancel={closeDialog}
        onSubmitted={onDialogSubmitted}
      />
    ) : dialog.action === "detach_volume" ? (
      <VmInstanceDetachVolumeModal
        instance={dialog.instance}
        onCancel={closeDialog}
        onSubmitted={onDialogSubmitted}
      />
    ) : dialog.action === "attach_filesystem" ? (
      <VmInstanceAttachFilesystemModal
        instance={dialog.instance}
        onCancel={closeDialog}
        onSubmitted={onDialogSubmitted}
      />
    ) : (
      <VmInstanceChangeSecurityGroupsModal
        instance={dialog.instance}
        onCancel={closeDialog}
        onSubmitted={onDialogSubmitted}
      />
    )
  ) : null;

  return { dialogNode, rowActions };
}
