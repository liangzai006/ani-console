import { Dropdown, Menu, Message, Tooltip } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import {
  DataTableRowActionButton,
  DataTableRowActions,
} from "@/components/common";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { ContainerInstanceAttachFilesystemModal } from "./ContainerInstanceAttachFilesystemModal";
import { ContainerInstanceAttachVolumeModal } from "./ContainerInstanceAttachVolumeModal";
import { ContainerInstanceBindSecretModal } from "./ContainerInstanceBindSecretModal";
import { ContainerInstanceChangeSecurityGroupsModal } from "./ContainerInstanceChangeSecurityGroupsModal";
import { ContainerInstanceDeleteModal } from "./ContainerInstanceDeleteModal";
import { ContainerInstanceDetachVolumeModal } from "./ContainerInstanceDetachVolumeModal";
import { ContainerInstanceResizeModal } from "./ContainerInstanceResizeModal";
import { ContainerInstanceRollbackModal } from "./ContainerInstanceRollbackModal";
import { ContainerInstanceScaleModal } from "./ContainerInstanceScaleModal";
import { ContainerInstanceStopModal } from "./ContainerInstanceStopModal";
import { ContainerInstanceUpdateImageModal } from "./ContainerInstanceUpdateImageModal";

type Instance = components["schemas"]["InstanceRecord"];
type LifecycleRequest = components["schemas"]["InstanceLifecycleRequest"];
type LifecycleAction = LifecycleRequest["action"];
type ModalAction = Extract<
  LifecycleAction,
  | "scale"
  | "update_image"
  | "resize"
  | "rollback"
  | "attach_volume"
  | "detach_volume"
  | "attach_filesystem"
  | "bind_secret"
  | "change_security_groups"
>;

const BUSY_STATES = new Set<Instance["state"]>([
  "pending",
  "provisioning",
  "starting",
  "stopping",
  "deleting",
]);

export function ContainerInstanceActions({
  instance,
  onChanged,
}: {
  instance: Instance;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const startScope = useIdempotencyScope("container-instance-start", [
    "POST",
    instance.id,
  ]);
  const restartScope = useIdempotencyScope("container-instance-restart", [
    "POST",
    instance.id,
  ]);
  const protectionScope = useIdempotencyScope(
    "container-instance-termination-protection",
    ["POST", instance.id],
  );
  const [modalAction, setModalAction] = useState<ModalAction>();
  const [stopVisible, setStopVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const start = useMutation({
    mutationFn: async () => {
      const submitData = { action: "start" as const };
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body: startScope.withKey(submitData),
        },
      );
      if (error) {
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error) }),
          status: response.status,
        };
      }
    },
    onSuccess: () => {
      startScope.reset();
      Message.success("启动已提交");
      onChanged();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  const restart = useMutation({
    mutationFn: async () => {
      const submitData = { action: "restart" as const };
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body: restartScope.withKey(submitData),
        },
      );
      if (error) {
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error) }),
          status: response.status,
        };
      }
    },
    onSuccess: () => {
      restartScope.reset();
      Message.success("重启已提交");
      onChanged();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  const terminationProtection = useMutation({
    mutationFn: async (enabled: boolean) => {
      const submitData = {
        action: "set_termination_protection" as const,
        enabled,
      };
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body: protectionScope.withKey(submitData),
        },
      );
      if (error) {
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error) }),
          status: response.status,
        };
      }
    },
    onSuccess: () => {
      protectionScope.reset();
      Message.success("终止保护已更新");
      onChanged();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  const busy =
    BUSY_STATES.has(instance.state) ||
    start.isPending ||
    restart.isPending ||
    terminationProtection.isPending;
  const running = instance.state === "running";
  const canStart = instance.state === "stopped" || instance.state === "failed";
  const stable = running || instance.state === "stopped";
  const protectedInstance = instance.termination_protection === true;
  const terminalAvailable =
    running && instance.access?.exec_available !== false;
  const detachableVolumes = (instance.volumes ?? []).filter(
    (volume) =>
      volume.kind !== "root_disk" && Boolean(volume.source_ref?.trim()),
  );
  const rollbackAvailable = (instance.container?.history ?? []).some(
    (entry) => entry.revision !== instance.container?.revision,
  );

  const handleMoreAction = async (action: string) => {
    if (action === "restart") {
      restart.mutate();
      return;
    }
    if (action === "terminal") {
      void navigate({
        to: "/container-instances/$instanceId",
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
      terminationProtection.mutate(!protectedInstance);
      return;
    }
    if (action === "delete") {
      setDeleteVisible(true);
      return;
    }
    setModalAction(action as ModalAction);
  };

  return (
    <>
      <DataTableRowActions>
        {canStart ? (
          <DataTableRowActionButton
            disabled={busy}
            onClick={() => start.mutate()}
          >
            启动
          </DataTableRowActionButton>
        ) : protectedInstance && running ? (
          <Tooltip content="已开启终止保护，请先关闭后再停止">
            <span className="inline-flex">
              <DataTableRowActionButton disabled>停止</DataTableRowActionButton>
            </span>
          </Tooltip>
        ) : (
          <DataTableRowActionButton
            disabled={!running || busy}
            title={running ? undefined : "当前状态不可停止"}
            onClick={() => setStopVisible(true)}
          >
            停止
          </DataTableRowActionButton>
        )}
        <Dropdown
          trigger="click"
          position="br"
          droplist={
            <Menu onClickMenuItem={handleMoreAction}>
              <Menu.Item key="restart" disabled={!running || busy}>
                重启
              </Menu.Item>
              <Menu.Item key="scale" disabled={!stable || busy}>
                扩缩容
              </Menu.Item>
              <Menu.Item key="update_image" disabled={!stable || busy}>
                更新镜像
              </Menu.Item>
              <Menu.Item
                key="resize"
                disabled={instance.state !== "stopped" || busy}
              >
                变配
              </Menu.Item>
              <Menu.Item
                key="rollback"
                disabled={
                  instance.state !== "stopped" || busy || !rollbackAvailable
                }
              >
                回滚发布
              </Menu.Item>
              <Menu.Item key="attach_volume" disabled={!stable || busy}>
                挂载云盘
              </Menu.Item>
              <Menu.Item
                key="detach_volume"
                disabled={!stable || busy || detachableVolumes.length === 0}
              >
                卸载云盘
              </Menu.Item>
              <Menu.Item key="attach_filesystem" disabled={!stable || busy}>
                挂载 NFS
              </Menu.Item>
              <Menu.Item key="bind_secret" disabled={!stable || busy}>
                绑定密钥
              </Menu.Item>
              <Menu.Item
                key="change_security_groups"
                disabled={!stable || busy}
              >
                更换安全组
              </Menu.Item>
              <Menu.Item key="load_balancer" disabled>
                <Tooltip content="当前 Core API 暂未提供负载均衡后端绑定能力">
                  <span className="block">挂到负载均衡</span>
                </Tooltip>
              </Menu.Item>
              <Menu.Item key="copy_endpoint" disabled={!instance.endpoint}>
                复制访问地址
              </Menu.Item>
              <Menu.Item key="termination_protection" disabled={busy}>
                {protectedInstance ? "关闭终止保护" : "开启终止保护"}
              </Menu.Item>
              <Menu.Item key="terminal" disabled={!terminalAvailable}>
                打开终端
              </Menu.Item>
              <Menu.Item
                key="delete"
                disabled={busy || protectedInstance}
                style={{ color: "var(--color-danger-6)" }}
              >
                删除
              </Menu.Item>
            </Menu>
          }
        >
          <DataTableRowActionButton disabled={busy}>
            更多
            <i
              className="iconfont icon-down-chevron-small ml-1"
              aria-hidden="true"
            />
          </DataTableRowActionButton>
        </Dropdown>
      </DataTableRowActions>

      {stopVisible && (
        <ContainerInstanceStopModal
          instance={instance}
          onCancel={() => setStopVisible(false)}
          onSubmitted={() => {
            setStopVisible(false);
            onChanged();
          }}
        />
      )}
      {deleteVisible && (
        <ContainerInstanceDeleteModal
          instance={instance}
          onCancel={() => setDeleteVisible(false)}
          onSubmitted={() => {
            setDeleteVisible(false);
            onChanged();
          }}
        />
      )}
      {modalAction === "scale" && (
        <ContainerInstanceScaleModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "update_image" && (
        <ContainerInstanceUpdateImageModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "resize" && (
        <ContainerInstanceResizeModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "rollback" && (
        <ContainerInstanceRollbackModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "attach_volume" && (
        <ContainerInstanceAttachVolumeModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "detach_volume" && (
        <ContainerInstanceDetachVolumeModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "attach_filesystem" && (
        <ContainerInstanceAttachFilesystemModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "bind_secret" && (
        <ContainerInstanceBindSecretModal
          instance={instance}
          onCancel={() => setModalAction(undefined)}
          onSubmitted={() => {
            setModalAction(undefined);
            onChanged();
          }}
        />
      )}
      {modalAction === "change_security_groups" && (
        <ContainerInstanceChangeSecurityGroupsModal
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
