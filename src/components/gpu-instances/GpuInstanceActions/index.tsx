import {
  Button,
  Checkbox,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  Message,
  Modal,
  Select,
} from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { coreApi } from "@/api/client";
import type { components } from "@/api/core-schema";
import { ListRowActionButton, ListRowActions } from "@/components/common";
import { newIdempotencyKey } from "@/lib/idempotency";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];
type LifecycleRequest = components["schemas"]["InstanceLifecycleRequest"];
type LifecycleAction = LifecycleRequest["action"];
type FormAction =
  | "scale"
  | "update_image"
  | "resize"
  | "rollback"
  | "attach_volume"
  | "detach_volume"
  | "attach_filesystem"
  | "bind_secret"
  | "change_security_groups";

type ActionFormValues = {
  replicas?: number;
  image_id?: string;
  cpu?: string;
  memory?: string;
  revision?: string;
  volume_id?: string;
  filesystem_id?: string;
  mount_path?: string;
  read_only?: boolean;
  secret_id?: string;
  binding_type?: "env" | "file";
  env_name?: string;
  security_group_ids?: string;
};

const ACTION_TITLES: Record<FormAction, string> = {
  scale: "扩缩容",
  update_image: "更新镜像",
  resize: "变配",
  rollback: "回滚发布",
  attach_volume: "挂载云盘",
  detach_volume: "卸载云盘",
  attach_filesystem: "挂载 NFS",
  bind_secret: "绑定密钥",
  change_security_groups: "更换安全组",
};

const BUSY_STATES = new Set([
  "pending",
  "provisioning",
  "starting",
  "stopping",
  "deleting",
]);

function openTerminalWindow(instanceId: string) {
  const url = `/instances/terminal/${encodeURIComponent(instanceId)}`;
  const width = 1200;
  const height = 800;
  const left = Math.max(
    0,
    window.screenX + Math.round((window.outerWidth - width) / 2),
  );
  const top = Math.max(
    0,
    window.screenY + Math.round((window.outerHeight - height) / 2),
  );
  window.open(
    url,
    `Connecting ${instanceId}`,
    `width=${width},height=${height},left=${left},top=${top},scrollbars=1,resizable=1`,
  );
}

function buildLifecycleBody(
  action: FormAction,
  values: ActionFormValues,
): LifecycleRequest {
  const base = {
    action,
    idempotency_key: newIdempotencyKey(),
  } as LifecycleRequest;

  switch (action) {
    case "scale":
      return { ...base, replicas: values.replicas };
    case "update_image":
      return { ...base, image_id: values.image_id, strategy: "rolling" };
    case "resize":
      return { ...base, cpu: values.cpu, memory: values.memory };
    case "rollback":
      return { ...base, revision: values.revision };
    case "attach_volume":
      return {
        ...base,
        volume_id: values.volume_id,
        mount_path: values.mount_path,
        read_only: values.read_only ?? false,
      };
    case "detach_volume":
      return { ...base, volume_id: values.volume_id };
    case "attach_filesystem":
      return {
        ...base,
        filesystem_id: values.filesystem_id,
        mount_path: values.mount_path,
        read_only: values.read_only ?? false,
      };
    case "bind_secret":
      return {
        ...base,
        secret_id: values.secret_id,
        binding_type: values.binding_type,
        env_name: values.binding_type === "env" ? values.env_name : undefined,
        mount_path:
          values.binding_type === "file" ? values.mount_path : undefined,
      };
    case "change_security_groups":
      return {
        ...base,
        security_group_ids: (values.security_group_ids ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      };
  }
}

export function GpuInstanceActions({
  instance,
  onChanged,
  display = "row",
}: {
  instance: Instance;
  onChanged: () => void;
  display?: "row" | "menu";
}) {
  const [form] = Form.useForm<ActionFormValues>();
  const [formAction, setFormAction] = useState<FormAction>();
  const [bindingType, setBindingType] = useState<"env" | "file">("env");
  const busy = BUSY_STATES.has(instance.state);

  const lifecycle = useMutation({
    mutationFn: async (body: LifecycleRequest) => {
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body,
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
      Message.success("操作已提交");
      setFormAction(undefined);
      form.resetFields();
      onChanged();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  const submitSimpleAction = (
    action: LifecycleAction,
    fields: Partial<LifecycleRequest> = {},
  ) =>
    lifecycle.mutate({
      action,
      idempotency_key: newIdempotencyKey(),
      ...fields,
    } as LifecycleRequest);

  const openActionForm = (action: FormAction) => {
    setBindingType("env");
    form.resetFields();
    form.setFieldsValue({
      replicas: instance.container?.replicas ?? 1,
      binding_type: "env",
      read_only: false,
    });
    setFormAction(action);
  };

  const handleMenuAction = async (action: string) => {
    if (action === "stop" || action === "restart") {
      submitSimpleAction(action);
      return;
    }
    if (action === "scale") {
      openActionForm("scale");
      return;
    }
    if (action === "terminal") return;
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
      submitSimpleAction("set_termination_protection", {
        enabled: !instance.termination_protection,
      });
      return;
    }
    if (action === "delete") {
      Modal.confirm({
        title: "删除 GPU 容器实例",
        content: `确定删除「${instance.name}」？删除后无法恢复。`,
        okButtonProps: { status: "danger" },
        onOk: () => submitSimpleAction("delete"),
      });
      return;
    }
    openActionForm(action as FormAction);
  };

  const moreMenu = (
    <Menu onClickMenuItem={handleMenuAction}>
      {display === "menu" ? (
        <>
          <Menu.Item
            key="stop"
            disabled={instance.state !== "running" || lifecycle.isPending}
          >
            停止
          </Menu.Item>
          <Menu.Item
            key="restart"
            disabled={instance.state !== "running" || lifecycle.isPending}
          >
            重启
          </Menu.Item>
          <Menu.Item key="scale" disabled={busy || lifecycle.isPending}>
            扩缩容
          </Menu.Item>
          <Menu.Item key="terminal" disabled>
            打开终端
          </Menu.Item>
        </>
      ) : null}
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

  return (
    <>
      {display === "row" ? (
        <ListRowActions>
          <ListRowActionButton
            disabled={instance.state !== "running" || lifecycle.isPending}
            onClick={() => submitSimpleAction("stop")}
          >
            停止
          </ListRowActionButton>
          <ListRowActionButton
            disabled={instance.state !== "running" || lifecycle.isPending}
            onClick={() => submitSimpleAction("restart")}
          >
            重启
          </ListRowActionButton>
          <ListRowActionButton
            disabled={busy || lifecycle.isPending}
            onClick={() => openActionForm("scale")}
          >
            扩缩容
          </ListRowActionButton>
          <ListRowActionButton
            disabled={instance.state !== "running"}
            onClick={() => openTerminalWindow(instance.id)}
          >
            终端
          </ListRowActionButton>
          <Dropdown trigger="click" position="br" droplist={moreMenu}>
            <ListRowActionButton disabled={lifecycle.isPending}>
              更多
              <i
                className="iconfont icon-down-chevron-small ml-1"
                aria-hidden="true"
              />
            </ListRowActionButton>
          </Dropdown>
        </ListRowActions>
      ) : (
        <Dropdown trigger="click" position="br" droplist={moreMenu}>
          <Button loading={lifecycle.isPending}>
            更多操作
            <i
              className="iconfont icon-down-chevron-small ml-1"
              aria-hidden="true"
            />
          </Button>
        </Dropdown>
      )}

      <Modal
        title={
          formAction ? `${ACTION_TITLES[formAction]} · ${instance.name}` : ""
        }
        visible={Boolean(formAction)}
        confirmLoading={lifecycle.isPending}
        onCancel={() => {
          setFormAction(undefined);
          form.resetFields();
        }}
        onOk={async () => {
          if (!formAction) return;
          const values = await form.validate();
          lifecycle.mutate(buildLifecycleBody(formAction, values));
        }}
        unmountOnExit
      >
        <Form form={form} layout="vertical">
          {formAction === "scale" ? (
            <Form.Item
              field="replicas"
              label="副本数"
              rules={[{ required: true, message: "请输入副本数" }]}
            >
              <InputNumber min={1} precision={0} className="w-full" />
            </Form.Item>
          ) : null}
          {formAction === "update_image" ? (
            <Form.Item
              field="image_id"
              label="镜像 ID"
              rules={[{ required: true, message: "请输入镜像 ID" }]}
            >
              <Input placeholder="请输入 Registry 镜像 ID" />
            </Form.Item>
          ) : null}
          {formAction === "resize" ? (
            <>
              <Form.Item
                field="cpu"
                label="CPU"
                rules={[{ required: true, message: "请输入 CPU" }]}
              >
                <Input placeholder="例如 4" />
              </Form.Item>
              <Form.Item
                field="memory"
                label="内存"
                rules={[{ required: true, message: "请输入内存" }]}
              >
                <Input placeholder="例如 8Gi" />
              </Form.Item>
            </>
          ) : null}
          {formAction === "rollback" ? (
            <Form.Item
              field="revision"
              label="目标修订版本"
              rules={[{ required: true, message: "请输入目标修订版本" }]}
            >
              <Input placeholder="请输入 revision" />
            </Form.Item>
          ) : null}
          {formAction === "attach_volume" || formAction === "detach_volume" ? (
            <Form.Item
              field="volume_id"
              label="云盘 ID"
              rules={[{ required: true, message: "请输入云盘 ID" }]}
            >
              <Input placeholder="请输入云盘 ID" />
            </Form.Item>
          ) : null}
          {formAction === "attach_filesystem" ? (
            <Form.Item
              field="filesystem_id"
              label="NFS 文件系统 ID"
              rules={[{ required: true, message: "请输入文件系统 ID" }]}
            >
              <Input placeholder="请输入文件系统 ID" />
            </Form.Item>
          ) : null}
          {formAction === "attach_volume" ||
          formAction === "attach_filesystem" ||
          (formAction === "bind_secret" && bindingType === "file") ? (
            <Form.Item
              field="mount_path"
              label="挂载路径"
              rules={[{ required: true, message: "请输入挂载路径" }]}
            >
              <Input placeholder="例如 /data" />
            </Form.Item>
          ) : null}
          {formAction === "attach_volume" ||
          formAction === "attach_filesystem" ? (
            <Form.Item field="read_only" triggerPropName="checked">
              <Checkbox>只读挂载</Checkbox>
            </Form.Item>
          ) : null}
          {formAction === "bind_secret" ? (
            <>
              <Form.Item
                field="secret_id"
                label="密钥 ID"
                rules={[{ required: true, message: "请输入密钥 ID" }]}
              >
                <Input placeholder="请输入密钥 ID" />
              </Form.Item>
              <Form.Item
                field="binding_type"
                label="绑定方式"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: "环境变量", value: "env" },
                    { label: "文件", value: "file" },
                  ]}
                  onChange={setBindingType}
                />
              </Form.Item>
              {bindingType === "env" ? (
                <Form.Item
                  field="env_name"
                  label="环境变量名"
                  rules={[{ required: true, message: "请输入环境变量名" }]}
                >
                  <Input placeholder="例如 API_KEY" />
                </Form.Item>
              ) : null}
            </>
          ) : null}
          {formAction === "change_security_groups" ? (
            <Form.Item
              field="security_group_ids"
              label="安全组 ID"
              extra="多个安全组 ID 使用英文逗号分隔；留空表示解除全部安全组。"
            >
              <Input placeholder="sg-1, sg-2" />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </>
  );
}
