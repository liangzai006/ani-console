import { Button, Dropdown, Menu, Message, Space, Tooltip } from "@arco-design/web-react";
import { IconDown } from "@arco-design/web-react/icon";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { coreApi } from "@/api/client";
import type { components } from "@/api/core-schema";
import { DataTableRowActionButton, DataTableRowActions } from "@/components/common";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { GpuInstanceAttachFilesystemModal } from "./GpuInstanceAttachFilesystemModal";
import { GpuInstanceAttachVolumeModal } from "./GpuInstanceAttachVolumeModal";
import { GpuInstanceBindSecretModal } from "./GpuInstanceBindSecretModal";
import { GpuInstanceChangeSecurityGroupsModal } from "./GpuInstanceChangeSecurityGroupsModal";
import { GpuInstanceDeleteModal } from "./GpuInstanceDeleteModal";
import { GpuInstanceDetachVolumeModal } from "./GpuInstanceDetachVolumeModal";
import { GpuInstanceResizeModal } from "./GpuInstanceResizeModal";
import { GpuInstanceRollbackLatestModal } from "./GpuInstanceRollbackLatestModal";
import { GpuInstanceRollbackModal } from "./GpuInstanceRollbackModal";
import { GpuInstanceScaleModal } from "./GpuInstanceScaleModal";
import { GpuInstanceStopModal } from "./GpuInstanceStopModal";
import { GpuInstanceUpdateImageModal } from "./GpuInstanceUpdateImageModal";

type Instance = components["schemas"]["InstanceRecord"];
type ModalAction =
  | "scale"
  | "update_image"
  | "resize"
  | "rollback"
  | "attach_volume"
  | "detach_volume"
  | "attach_filesystem"
  | "bind_secret"
  | "change_security_groups";

const BUSY_STATES = new Set(["pending", "provisioning", "starting", "stopping", "deleting"]);

const TERMINATION_PROTECTION_STOP_TOOLTIP = "已开启终止保护，请先关闭终止保护后再关机";

export function GpuInstanceActions({
  instance,
  onChanged,
  onDeleted,
  display = "row",
}: {
  instance: Instance;
  onChanged: () => void;
  onDeleted?: () => void;
  display?: "row" | "detail" | "release" | "configuration";
}) {
  const navigate = useNavigate();
  const startScope = useIdempotencyScope("gpu-instance-start", ["POST", instance.id]);
  const restartScope = useIdempotencyScope("gpu-instance-restart", ["POST", instance.id]);
  const protectionScope = useIdempotencyScope("gpu-instance-termination-protection", [
    "POST",
    instance.id,
  ]);
  const [modalAction, setModalAction] = useState<ModalAction>();
  const [stopVisible, setStopVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [rollbackLatestVisible, setRollbackLatestVisible] = useState(false);
  const start = useMutation({
    mutationFn: async () => {
      const submitData = { action: "start" as const };
      const { error, response } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
        params: { path: { instance_id: instance.id } },
        body: startScope.withKey(submitData),
      });
      if (error)
        throw {
          ...(typeof error === "object" && error ? error : { message: String(error) }),
          status: response.status,
        };
    },
    onSuccess: () => {
      startScope.reset();
      Message.success("启动已提交");
      onChanged();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  const restart = useMutation({
    mutationFn: async () => {
      const submitData = { action: "restart" as const };
      const { error, response } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
        params: { path: { instance_id: instance.id } },
        body: restartScope.withKey(submitData),
      });
      if (error)
        throw {
          ...(typeof error === "object" && error ? error : { message: String(error) }),
          status: response.status,
        };
    },
    onSuccess: () => {
      restartScope.reset();
      Message.success("重启已提交");
      onChanged();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  const terminationProtection = useMutation({
    mutationFn: async (enabled: boolean) => {
      const submitData = {
        action: "set_termination_protection" as const,
        enabled,
      };
      const { error, response } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
        params: { path: { instance_id: instance.id } },
        body: protectionScope.withKey(submitData),
      });
      if (error)
        throw {
          ...(typeof error === "object" && error ? error : { message: String(error) }),
          status: response.status,
        };
    },
    onSuccess: () => {
      protectionScope.reset();
      Message.success("终止保护已更新");
      onChanged();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  const actionPending = start.isPending || restart.isPending || terminationProtection.isPending;
  const busy = BUSY_STATES.has(instance.state) || actionPending;
  const stopBlockedByTerminationProtection = instance.termination_protection === true;
  const terminalAvailable =
    instance.state === "running" && instance.access?.exec_available !== false;
  const stopDisabled =
    instance.state !== "running" || actionPending || stopBlockedByTerminationProtection;
  const canStart = instance.state === "stopped";

  const handleMenuAction = async (action: string) => {
    if (action === "stop") {
      if (!stopBlockedByTerminationProtection) setStopVisible(true);
      return;
    }
    if (action === "restart") {
      restart.mutate();
      return;
    }
    if (action === "scale") {
      setModalAction("scale");
      return;
    }
    if (action === "terminal") {
      navigate({
        to: "/gpu-instances/$instanceId",
        params: { instanceId: instance.id },
        search: { tab: "terminal" },
      });
      return;
    }
    if (action === "copy_endpoint") {
      if (!instance.endpoint) return;
      try {
        await navigator.clipboard.writeText(instance.endpoint);
        Message.success("访问地址已复制");
      } catch {
        Message.error("访问地址复制失败");
      }
      return;
    }
    if (action === "termination_protection") {
      terminationProtection.mutate(!instance.termination_protection);
      return;
    }
    if (action === "delete") {
      setDeleteVisible(true);
      return;
    }
    setModalAction(action as ModalAction);
  };

  const moreMenu = (
    <Menu onClickMenuItem={handleMenuAction}>
      <Menu.Item key="restart" disabled={instance.state !== "running" || actionPending}>
        重启
      </Menu.Item>
      <Menu.Item key="scale" disabled={busy}>
        扩缩容
      </Menu.Item>
      <Menu.Item key="terminal" disabled={!terminalAvailable}>
        打开终端
      </Menu.Item>
      <Menu.Item key="update_image" disabled={busy}>
        更新镜像
      </Menu.Item>
      <Menu.Item key="resize" disabled={instance.state !== "stopped"}>
        变配
      </Menu.Item>
      <Menu.Item key="rollback" disabled={instance.state !== "stopped"}>
        回滚发布
      </Menu.Item>
      <Menu.Item key="attach_volume" disabled={busy}>
        挂载云盘
      </Menu.Item>
      <Menu.Item key="detach_volume" disabled={busy}>
        卸载云盘
      </Menu.Item>
      <Menu.Item key="attach_filesystem" disabled={busy}>
        挂载 NFS
      </Menu.Item>
      <Menu.Item key="bind_secret" disabled={busy}>
        绑定密钥
      </Menu.Item>
      <Menu.Item key="change_security_groups" disabled={busy}>
        更换安全组
      </Menu.Item>
      <Menu.Item key="copy_endpoint" disabled={!instance.endpoint}>
        复制访问地址
      </Menu.Item>
      <Menu.Item
        key="termination_protection"
        disabled={instance.state === "deleting" || instance.state === "deleted"}
      >
        {instance.termination_protection ? "关闭终止保护" : "开启终止保护"}
      </Menu.Item>
      <Menu.Item
        key="delete"
        disabled={busy || instance.termination_protection}
        style={{ color: "var(--color-danger-6)" }}
      >
        删除
      </Menu.Item>
    </Menu>
  );
  const lifecycleButton =
    display === "row" ? (
      <DataTableRowActionButton
        disabled={canStart ? actionPending : stopDisabled}
        onClick={() => {
          if (canStart) start.mutate();
          else setStopVisible(true);
        }}
      >
        {canStart ? "启动" : "停止"}
      </DataTableRowActionButton>
    ) : (
      <Button
        disabled={canStart ? actionPending : stopDisabled}
        loading={start.isPending}
        onClick={() => {
          if (canStart) start.mutate();
          else setStopVisible(true);
        }}
      >
        {canStart ? "启动" : "停止"}
      </Button>
    );
  const lifecycleControl =
    stopBlockedByTerminationProtection && instance.state === "running" ? (
      <Tooltip content={TERMINATION_PROTECTION_STOP_TOOLTIP}>
        <span className="inline-flex">{lifecycleButton}</span>
      </Tooltip>
    ) : (
      lifecycleButton
    );

  return (
    <>
      {display === "row" ? (
        <DataTableRowActions>
          {lifecycleControl}
          <Dropdown trigger="click" position="br" droplist={moreMenu}>
            <DataTableRowActionButton disabled={actionPending}>
              更多
              <i className="iconfont icon-down-chevron-small ml-1" aria-hidden="true" />
            </DataTableRowActionButton>
          </Dropdown>
        </DataTableRowActions>
      ) : display === "detail" ? (
        <Space>
          {lifecycleControl}
          <Dropdown trigger="click" position="br" droplist={moreMenu}>
            <Button disabled={actionPending} loading={actionPending}>
              更多操作
              <IconDown className="ml-1 text-xs" />
            </Button>
          </Dropdown>
        </Space>
      ) : display === "release" ? (
        <Space>
          <Button size="small" disabled={busy} onClick={() => setModalAction("update_image")}>
            更新镜像
          </Button>
          <Button
            size="small"
            disabled={instance.state !== "stopped" || actionPending}
            onClick={() => setRollbackLatestVisible(true)}
          >
            回滚上一版
          </Button>
        </Space>
      ) : display === "configuration" ? (
        <Button size="small" disabled={busy} onClick={() => setModalAction("bind_secret")}>
          绑定密钥
        </Button>
      ) : null}

      {stopVisible && (
        <GpuInstanceStopModal
          instance={instance}
          onCancel={() => setStopVisible(false)}
          onSubmitted={() => {
            setStopVisible(false);
            onChanged();
          }}
        />
      )}
      {deleteVisible && (
        <GpuInstanceDeleteModal
          instance={instance}
          onCancel={() => setDeleteVisible(false)}
          onSubmitted={() => {
            setDeleteVisible(false);
            if (onDeleted) onDeleted();
            else onChanged();
          }}
        />
      )}
      {rollbackLatestVisible && (
        <GpuInstanceRollbackLatestModal
          instance={instance}
          onCancel={() => setRollbackLatestVisible(false)}
          onSubmitted={() => {
            setRollbackLatestVisible(false);
            onChanged();
          }}
        />
      )}
      {modalAction === "scale" && (
        <GpuInstanceScaleModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "update_image" && (
        <GpuInstanceUpdateImageModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "resize" && (
        <GpuInstanceResizeModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "rollback" && (
        <GpuInstanceRollbackModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "attach_volume" && (
        <GpuInstanceAttachVolumeModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "detach_volume" && (
        <GpuInstanceDetachVolumeModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "attach_filesystem" && (
        <GpuInstanceAttachFilesystemModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "bind_secret" && (
        <GpuInstanceBindSecretModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "change_security_groups" && (
        <GpuInstanceChangeSecurityGroupsModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
    </>
  );
}
