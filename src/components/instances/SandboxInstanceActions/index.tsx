import {
  Alert,
  Button,
  Dropdown,
  Menu,
  Message,
  Modal,
  Select,
  Space,
} from "@arco-design/web-react";
import { IconDown } from "@arco-design/web-react/icon";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import {
  DataTableRowActionButton,
  DataTableRowActions,
} from "@/components/common";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import type { SandboxInstanceDetailTabKey } from "@/lib/instance-detail-tabs";
import { formatDurationSeconds } from "../SandboxInstanceDetailPage/utils";

type SandboxInstance = components["schemas"]["InstanceRecord"];
type LifecycleAction = "pause" | "resume" | "extend" | "touch_idle" | "delete";

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
  onTabChange,
  display = "detail",
}: {
  instance: SandboxInstance;
  onChanged: () => void;
  onDeleted: () => void;
  onTabChange: (tab: SandboxInstanceDetailTabKey) => void;
  display?: "row" | "detail";
}) {
  const lifecycleScope = useIdempotencyScope("sandbox-instance-lifecycle", [
    "POST",
    instance.id,
  ]);
  const [extendVisible, setExtendVisible] = useState(false);
  const [extendDuration, setExtendDuration] = useState("1h");
  const sandbox = instance.sandbox;
  const sessionState = sandbox?.session_state ?? instance.state;
  const running = sessionState === "running";
  const resumable = sessionState === "paused" || sessionState === "stopped";
  const terminalAvailable =
    running && instance.access?.exec_available !== false;

  const lifecycle = useMutation({
    mutationFn: async ({
      action,
      duration,
    }: {
      action: LifecycleAction;
      duration?: string;
    }) => {
      const submitData = { action, duration };
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body: lifecycleScope.withKey(submitData),
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
      return action;
    },
    onSuccess: (action) => {
      lifecycleScope.reset();
      const messages: Record<LifecycleAction, string> = {
        pause: "Sandbox 暂停操作已提交",
        resume: "Sandbox 恢复操作已提交",
        extend: "会话时长已延长",
        touch_idle: "空闲计时已刷新",
        delete: "Sandbox 已销毁",
      };
      Message.success(messages[action]);
      if (action === "extend") setExtendVisible(false);
      if (action === "delete") onDeleted();
      else onChanged();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  const busy =
    lifecycle.isPending || BUSY_INSTANCE_STATES.has(instance.state ?? "");
  const lifecycleUnavailable = TERMINAL_STATES.has(sessionState);

  const handleMenuAction = (action: string) => {
    if (action === "terminal") {
      onTabChange("terminal");
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
      <Menu.Item key="extend" disabled={busy || lifecycleUnavailable}>
        延长会话
      </Menu.Item>
      <Menu.Item key="touch_idle" disabled={busy || !running}>
        活跃续期
      </Menu.Item>
      <Menu.Item key="terminal" disabled={!terminalAvailable}>
        打开终端
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
  const lifecycleDisabled = busy || (!running && !resumable);
  const lifecycleAction = () =>
    lifecycle.mutate({ action: running ? "pause" : "resume" });

  return (
    <>
      {display === "row" ? (
        <DataTableRowActions>
          <DataTableRowActionButton
            disabled={lifecycleDisabled}
            onClick={lifecycleAction}
          >
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
            disabled={lifecycleDisabled}
            loading={lifecycle.isPending}
            onClick={lifecycleAction}
          >
            {running ? "暂停" : "恢复"}
          </Button>
          <Dropdown trigger="click" position="br" droplist={menu}>
            <Button disabled={busy} loading={lifecycle.isPending}>
              更多操作
              <IconDown className="ml-1 text-xs" />
            </Button>
          </Dropdown>
        </Space>
      )}

      <Modal
        title={`延长会话 · ${instance.name || instance.id}`}
        visible={extendVisible}
        confirmLoading={lifecycle.isPending}
        onCancel={() => {
          lifecycleScope.reset();
          setExtendVisible(false);
        }}
        onOk={() =>
          lifecycle.mutateAsync({
            action: "extend",
            duration: extendDuration,
          })
        }
        unmountOnExit
      >
        <Alert
          className="mb-4"
          type="info"
          content={`当前剩余：${formatDurationSeconds(sandbox?.remain_seconds)}。延长后仍受空闲超时约束。`}
        />
        <div className="mb-2 text-(--color-text-2)">延长时长</div>
        <Select
          className="w-full"
          value={extendDuration}
          onChange={setExtendDuration}
          options={[
            { label: "+30 分钟", value: "30m" },
            { label: "+1 小时", value: "1h" },
            { label: "+2 小时", value: "2h" },
          ]}
        />
      </Modal>
    </>
  );
}
