import { applyInstanceLifecycle, type InstanceRecord } from "@/api/instances";
import type { RowAction } from "@/components/common";
import { copyToClipboard } from "@/lib/clipboard";
import { openContainerInstanceTerminalWindow } from "@/lib/instances";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { ContainerInstanceAttachFilesystemModal } from "../../ContainerInstanceActions/ContainerInstanceAttachFilesystemModal";
import { ContainerInstanceAttachVolumeModal } from "../../ContainerInstanceActions/ContainerInstanceAttachVolumeModal";
import { ContainerInstanceBindSecretModal } from "../../ContainerInstanceActions/ContainerInstanceBindSecretModal";
import { ContainerInstanceChangeSecurityGroupsModal } from "../../ContainerInstanceActions/ContainerInstanceChangeSecurityGroupsModal";
import { ContainerInstanceDeleteModal } from "../../ContainerInstanceActions/ContainerInstanceDeleteModal";
import { ContainerInstanceDetachVolumeModal } from "../../ContainerInstanceActions/ContainerInstanceDetachVolumeModal";
import { ContainerInstanceResizeModal } from "../../ContainerInstanceActions/ContainerInstanceResizeModal";
import { ContainerInstanceRollbackModal } from "../../ContainerInstanceActions/ContainerInstanceRollbackModal";
import { ContainerInstanceScaleModal } from "../../ContainerInstanceActions/ContainerInstanceScaleModal";
import { ContainerInstanceStopModal } from "../../ContainerInstanceActions/ContainerInstanceStopModal";
import { ContainerInstanceUpdateImageModal } from "../../ContainerInstanceActions/ContainerInstanceUpdateImageModal";
import type { ContainerInstance } from "../types";

type Instance = InstanceRecord;
type DialogAction =
  | "stop"
  | "delete"
  | "scale"
  | "update_image"
  | "resize"
  | "rollback"
  | "attach_volume"
  | "detach_volume"
  | "attach_filesystem"
  | "bind_secret"
  | "change_security_groups";
type DialogState = { action: DialogAction; instance: Instance };

const BUSY_STATES = new Set<Instance["state"]>([
  "pending",
  "provisioning",
  "starting",
  "stopping",
  "deleting",
]);

export function useContainerInstanceRowActions(onChanged: () => void) {
  const [dialog, setDialog] = useState<DialogState>();
  const start = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "container-start",
        action: "操作",
        successText: "启动已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: (instance: Instance) => applyInstanceLifecycle(instance.id, { action: "start" }),
    onSuccess: onChanged,
  });
  const restart = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "container-restart",
        action: "操作",
        successText: "重启已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: (instance: Instance) => applyInstanceLifecycle(instance.id, { action: "restart" }),
    onSuccess: onChanged,
  });
  const protection = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "container-protection",
        action: "操作",
        successText: "终止保护已更新",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: ({ instance, enabled }: { instance: Instance; enabled: boolean }) =>
      applyInstanceLifecycle(instance.id, { action: "set_termination_protection", enabled }),
    onSuccess: onChanged,
  });

  const record = (row: ContainerInstance) => row.record;
  const pending = (instance: Instance) =>
    (start.isPending && start.variables?.id === instance.id) ||
    (restart.isPending && restart.variables?.id === instance.id) ||
    (protection.isPending && protection.variables?.instance.id === instance.id);
  const busy = (instance: Instance) => BUSY_STATES.has(instance.state) || pending(instance);
  const running = (instance: Instance) => instance.state === "running";
  const canStart = (instance: Instance) =>
    instance.state === "stopped" || instance.state === "failed";
  const stable = (instance: Instance) => running(instance) || instance.state === "stopped";
  const protectedInstance = (instance: Instance) => instance.termination_protection === true;

  const rowActions: Array<RowAction<ContainerInstance>> = [
    {
      key: "lifecycle",
      label: (row) => (canStart(record(row)) ? "启动" : "停止"),
      widthLabel: "启动",
      disabled: (row) => {
        const instance = record(row);
        return canStart(instance)
          ? busy(instance)
          : !running(instance) || busy(instance) || protectedInstance(instance);
      },
      loading: (row) => start.isPending && start.variables?.id === record(row).id,
      tooltip: (row) =>
        protectedInstance(record(row)) && running(record(row))
          ? "已开启终止保护，请先关闭后再停止"
          : undefined,
      onClick: (row) => {
        const instance = record(row);
        if (canStart(instance)) return start.mutateAsync(instance);
        setDialog({ action: "stop", instance });
      },
    },
    {
      key: "restart",
      label: "重启",
      disabled: (row) => !running(record(row)) || busy(record(row)),
      onClick: (row) => restart.mutateAsync(record(row)),
    },
    ...(
      [
        "scale",
        "update_image",
        "resize",
        "rollback",
        "attach_volume",
        "detach_volume",
        "attach_filesystem",
        "bind_secret",
        "change_security_groups",
      ] as const
    ).map((action): RowAction<ContainerInstance> => ({
      key: action,
      label: {
        scale: "扩缩容",
        update_image: "更新镜像",
        resize: "变配",
        rollback: "回滚发布",
        attach_volume: "挂载云盘",
        detach_volume: "卸载云盘",
        attach_filesystem: "挂载 NFS",
        bind_secret: "绑定密钥",
        change_security_groups: "更换安全组",
      }[action],
      disabled: (row) => {
        const instance = record(row);
        if (action === "resize" || action === "rollback") {
          const rollbackAvailable = (instance.container?.history ?? []).some(
            (entry) => entry.revision !== instance.container?.revision,
          );
          return (
            instance.state !== "stopped" ||
            busy(instance) ||
            (action === "rollback" && !rollbackAvailable)
          );
        }
        if (action === "detach_volume") {
          return (
            !stable(instance) ||
            busy(instance) ||
            !(instance.volumes ?? []).some(
              (volume) => volume.kind !== "root_disk" && Boolean(volume.source_ref?.trim()),
            )
          );
        }
        return !stable(instance) || busy(instance);
      },
      onClick: (row) => setDialog({ action, instance: record(row) }),
    })),
    {
      key: "load-balancer",
      label: "挂到负载均衡",
      disabled: () => true,
      tooltip: "当前 Core API 暂未提供负载均衡后端绑定能力",
      onClick: () => undefined,
    },
    {
      key: "copy-endpoint",
      label: "复制访问地址",
      disabled: (row) => !record(row).endpoint,
      onClick: (row) => copyToClipboard(record(row).endpoint ?? "", "访问地址"),
    },
    {
      key: "protection",
      label: (row) => (protectedInstance(record(row)) ? "关闭终止保护" : "开启终止保护"),
      widthLabel: "关闭终止保护",
      disabled: (row) => busy(record(row)),
      onClick: (row) => {
        const instance = record(row);
        return protection.mutateAsync({ instance, enabled: !protectedInstance(instance) });
      },
    },
    {
      key: "terminal",
      label: "远程终端",
      disabled: (row) => !running(record(row)) || record(row).access?.exec_available === false,
      onClick: (row) => openContainerInstanceTerminalWindow(record(row).id),
    },
    {
      key: "delete",
      label: "删除",
      intent: "danger",
      disabled: (row) => busy(record(row)) || protectedInstance(record(row)),
      onClick: (row) => setDialog({ action: "delete", instance: record(row) }),
    },
  ];

  const close = () => setDialog(undefined);
  const submitted = () => {
    close();
    onChanged();
  };
  const dialogNode = dialog ? (
    dialog.action === "stop" ? (
      <ContainerInstanceStopModal
        instance={dialog.instance}
        onCancel={close}
        onSubmitted={submitted}
      />
    ) : dialog.action === "delete" ? (
      <ContainerInstanceDeleteModal
        instance={dialog.instance}
        onCancel={close}
        onSubmitted={submitted}
      />
    ) : dialog.action === "scale" ? (
      <ContainerInstanceScaleModal
        instance={dialog.instance}
        onCancel={close}
        onSubmitted={submitted}
      />
    ) : dialog.action === "update_image" ? (
      <ContainerInstanceUpdateImageModal
        instance={dialog.instance}
        onCancel={close}
        onSubmitted={submitted}
      />
    ) : dialog.action === "resize" ? (
      <ContainerInstanceResizeModal
        instance={dialog.instance}
        onCancel={close}
        onSubmitted={submitted}
      />
    ) : dialog.action === "rollback" ? (
      <ContainerInstanceRollbackModal
        instance={dialog.instance}
        onCancel={close}
        onSubmitted={submitted}
      />
    ) : dialog.action === "attach_volume" ? (
      <ContainerInstanceAttachVolumeModal
        instance={dialog.instance}
        onCancel={close}
        onSubmitted={submitted}
      />
    ) : dialog.action === "detach_volume" ? (
      <ContainerInstanceDetachVolumeModal
        instance={dialog.instance}
        onCancel={close}
        onSubmitted={submitted}
      />
    ) : dialog.action === "attach_filesystem" ? (
      <ContainerInstanceAttachFilesystemModal
        instance={dialog.instance}
        onCancel={close}
        onSubmitted={submitted}
      />
    ) : dialog.action === "bind_secret" ? (
      <ContainerInstanceBindSecretModal
        instance={dialog.instance}
        onCancel={close}
        onSubmitted={submitted}
      />
    ) : (
      <ContainerInstanceChangeSecurityGroupsModal
        instance={dialog.instance}
        onCancel={close}
        onSubmitted={submitted}
      />
    )
  ) : null;

  return { dialogNode, rowActions };
}
