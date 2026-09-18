import type { InstanceRecord } from "@/api/instances";
import { applyInstanceLifecycle } from "@/api/instances";
import { Button, Dropdown, Menu, Modal, Space } from "@arco-design/web-react";
import { IconDown, IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DataTableRowActionButton, DataTableRowActions } from "@/components/common";

import { openSandboxInstanceTerminalWindow } from "@/lib/instances";
import { SandboxInstanceExtendModal } from "./SandboxInstanceExtendModal";

type SandboxInstance = InstanceRecord;
type LifecycleAction = "pause" | "resume" | "touch_idle" | "delete";

const TERMINAL_STATES = new Set(["expired", "deleted", "deleting"]);
const BUSY_INSTANCE_STATES = new Set([
  "pending",
  "provisioning",
  "starting",
  "stopping",
  "deleting",
]);

export function SandboxInstanceActions({
  instance,
  onChanged,
  onDeleted,
  display = "detail",
}: {
  instance: SandboxInstance;
  onChanged: () => void;
  onDeleted: () => void;
  display?: "row" | "detail";
}) {
  const [extendVisible, setExtendVisible] = useState(false);
  const sandbox = instance.sandbox;
  const sessionState = sandbox?.session_state ?? instance.state;
  const running = sessionState === "running";
  const resumable = sessionState === "paused" || sessionState === "stopped";
  const terminalAvailable = running && instance.access?.exec_available !== false;

  const lifecycle = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "sandbox-lifecycle",
        action: "操作",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async ({ action }: { action: LifecycleAction }) => {
      const submitData = { action };
      await applyInstanceLifecycle(instance.id, submitData);
      return action;
    },
    onSuccess: (action) => {
      if (action === "delete") onDeleted();
      else onChanged();
    },
  });

  const busy = lifecycle.isPending || BUSY_INSTANCE_STATES.has(instance.state ?? "");
  const lifecycleUnavailable = TERMINAL_STATES.has(sessionState);
  const lifecycleDisabled = busy || (!running && !resumable);
  const lifecycleAction = () => lifecycle.mutate({ action: running ? "pause" : "resume" });

  const handleMenuAction = (action: string) => {
    if (action === "lifecycle") {
      lifecycleAction();
      return;
    }
    if (action === "terminal") {
      openSandboxInstanceTerminalWindow(instance.id);
      return;
    }
    if (action === "extend") {
      setExtendVisible(true);
      return;
    }
    if (action === "delete") {
      Modal.confirm({
        title: "销毁 Sandbox",
        content: `确认销毁「${instance.name || instance.id}」？工作区和未保存数据将不可恢复。`,
        okButtonProps: { status: "danger" },
        onOk: () => lifecycle.mutateAsync({ action: "delete" }),
      });
      return;
    }
    lifecycle.mutate({ action: action as LifecycleAction });
  };

  const menu = (
    <Menu onClickMenuItem={handleMenuAction}>
      {display === "detail" ? (
        <Menu.Item key="lifecycle" disabled={lifecycleDisabled}>
          {running ? "暂停" : "恢复"}
        </Menu.Item>
      ) : null}
      <Menu.Item key="extend" disabled={busy || lifecycleUnavailable}>
        延长会话
      </Menu.Item>
      <Menu.Item key="touch_idle" disabled={busy || !running}>
        活跃续期
      </Menu.Item>
      <Menu.Item key="terminal" disabled={!terminalAvailable}>
        远程终端
      </Menu.Item>
      <Menu.Item
        key="delete"
        disabled={busy || sessionState === "deleted"}
        style={{ color: "var(--color-danger-6)" }}
      >
        销毁
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      {display === "row" ? (
        <DataTableRowActions>
          <DataTableRowActionButton disabled={lifecycleDisabled} onClick={lifecycleAction}>
            {running ? "暂停" : "恢复"}
          </DataTableRowActionButton>
          <Dropdown trigger="click" position="br" droplist={menu}>
            <DataTableRowActionButton disabled={busy}>
              更多
              <IconDown className="ml-1 text-xs" />
            </DataTableRowActionButton>
          </Dropdown>
        </DataTableRowActions>
      ) : (
        <Space>
          <Button
            type="primary"
            disabled={!terminalAvailable}
            onClick={() => openSandboxInstanceTerminalWindow(instance.id)}
          >
            远程终端
          </Button>
          <Dropdown trigger="click" position="br" droplist={menu}>
            <Button
              disabled={busy}
              loading={lifecycle.isPending}
              aria-label="更多操作"
              title="更多操作"
            >
              <IconMoreVertical />
            </Button>
          </Dropdown>
        </Space>
      )}

      <SandboxInstanceExtendModal
        instance={instance}
        visible={extendVisible}
        onCancel={() => setExtendVisible(false)}
        onSubmitted={() => {
          setExtendVisible(false);
          onChanged();
        }}
      />
    </>
  );
}
