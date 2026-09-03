import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  Message,
  Modal,
  Select,
  Spin,
  Steps,
  Switch,
  Tooltip,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { listOrThrow } from "@/lib/api-list";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { getImageDisplayName } from "@/lib/render";
import { ImageNameText } from "@/components/common";

type SandboxTemplate = components["schemas"]["SandboxTemplate"];
type EgressPolicy = components["schemas"]["SandboxNetworkEgressPolicy"];

type FormState = {
  name: string;
  templateId: string;
  cpu: string;
  memory: string;
  sessionTimeout: string;
  idleTimeout: string;
  onTimeout: "pause" | "kill";
  egressPolicy: EgressPolicy;
  egressAllowlist: string;
  autoStart: boolean;
};

const INITIAL: FormState = {
  name: "",
  templateId: "",
  cpu: "1",
  memory: "2Gi",
  sessionTimeout: "120m",
  idleTimeout: "30m",
  onTimeout: "pause",
  egressPolicy: "allowlist",
  egressAllowlist: "pypi.org\ngithub.com\nregistry.npmjs.org",
  autoStart: true,
};

export function SandboxInstanceCreateModal({
  visible,
  onCancel,
  onCreated,
}: {
  visible: boolean;
  onCancel: () => void;
  onCreated: (instanceId: string) => void;
}) {
  const createScope = useIdempotencyScope("sandbox-instance-create", ["POST"]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const templates = useQuery({
    queryKey: ["sandbox-templates", "create-modal"],
    enabled: visible,
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/sandbox-templates", {
          params: { query: { limit: 100 } },
        }),
      ),
  });
  const items = useMemo(
    () =>
      (templates.data as { items?: SandboxTemplate[] } | undefined)?.items ??
      [],
    [templates.data],
  );
  const selected =
    items.find((item) => item.id === form.templateId) ?? items[0];

  useEffect(() => {
    if (!visible) {
      setStep(0);
      setForm(INITIAL);
      return;
    }
    if (!form.templateId && items[0]) {
      setForm((current) => ({
        ...current,
        templateId: items[0].id,
        cpu: items[0].cpu_cores ? String(items[0].cpu_cores) : current.cpu,
        memory: items[0].memory_gb ? `${items[0].memory_gb}Gi` : current.memory,
      }));
    }
  }, [form.templateId, items, visible]);

  const create = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("请选择可用的 Sandbox 模板");
      const submitData = {
        name: form.name.trim(),
        kind: "sandbox" as const,
        instance_type: "sandbox" as const,
        image: selected.image,
        cpu: form.cpu,
        memory: form.memory,
        auto_start: form.autoStart,
        termination_protection: false,
        replicas: 1,
        ssh_username: null,
        sandbox_config: {
          runtime_class: "sandbox-kata",
          template_id: selected.id,
          session_timeout: form.sessionTimeout,
          idle_timeout: form.idleTimeout,
          on_timeout: form.onTimeout,
          network_egress_policy: form.egressPolicy,
          egress_allowlist:
            form.egressPolicy === "allowlist"
              ? form.egressAllowlist
                  .split(/\r?\n/)
                  .map((host) => host.trim())
                  .filter(Boolean)
              : [],
        },
      };
      const { data, error, response } = await coreApi.POST("/instances", {
        body: createScope.withKey(submitData),
      });
      if (error || !data)
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: "创建失败" }),
          status: response.status,
        };
      return data;
    },
    onSuccess: (data) => {
      createScope.reset();
      Message.success("Sandbox 创建已提交");
      onCreated(data.instance.id);
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "create")),
  });

  const chooseTemplate = (templateId: string) => {
    const template = items.find((item) => item.id === templateId);
    setForm((current) => ({
      ...current,
      templateId,
      cpu: template?.cpu_cores ? String(template.cpu_cores) : current.cpu,
      memory: template?.memory_gb ? `${template.memory_gb}Gi` : current.memory,
    }));
  };

  const canNext =
    step === 0
      ? Boolean(form.name.trim() && selected)
      : step === 1
        ? form.egressPolicy !== "allowlist" ||
          Boolean(form.egressAllowlist.trim())
        : true;
  const footer = (
    <div className="flex justify-end gap-2">
      <Button onClick={onCancel}>取消</Button>
      {step > 0 ? (
        <Button onClick={() => setStep((value) => value - 1)}>上一步</Button>
      ) : null}
      {step < 2 ? (
        <Button
          type="primary"
          disabled={!canNext}
          onClick={() => setStep((value) => value + 1)}
        >
          下一步
        </Button>
      ) : (
        <Button
          type="primary"
          loading={create.isPending}
          onClick={() => create.mutate()}
        >
          创建 Sandbox
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      title="创建 Sandbox"
      visible={visible}
      onCancel={() => {
        createScope.reset();
        onCancel();
      }}
      footer={footer}
      style={{ width: 760 }}
      unmountOnExit
      maskClosable={false}
    >
      <Steps current={step} size="small" className="mb-6">
        <Steps.Step title="模板与规格" />
        <Steps.Step title="时长与出口策略" />
        <Steps.Step title="确认" />
      </Steps>

      {step === 0 ? (
        templates.isLoading ? (
          <div className="py-12 text-center">
            <Spin />
          </div>
        ) : (
          <Form layout="vertical" className="mx-auto max-w-xl">
            <Form.Item label="Sandbox 名称" required>
              <Input
                value={form.name}
                onChange={(name) =>
                  setForm((current) => ({ ...current, name }))
                }
                placeholder="demo-sandbox-xx"
              />
            </Form.Item>
            <Form.Item label="模板" required>
              <Select
                value={selected?.id}
                onChange={chooseTemplate}
                placeholder="选择模板"
                notFoundContent="暂无可用模板"
              >
                {items.map((item) => (
                  <Select.Option key={item.id} value={item.id}>
                    <Tooltip content={`${item.name} · ${item.image}`}>
                      <span className="block truncate">
                        {item.name} · {getImageDisplayName(item.image)}
                      </span>
                    </Tooltip>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="模板镜像（仓库）">
              <Tooltip content={selected?.image ?? "-"}>
                <Input
                  value={getImageDisplayName(selected?.image)}
                  readOnly
                  disabled
                />
              </Tooltip>
            </Form.Item>
            <Form.Item label="CPU">
              <Select
                value={form.cpu}
                onChange={(cpu) => setForm((current) => ({ ...current, cpu }))}
                options={["1", "2", "4"]}
              />
            </Form.Item>
            <Form.Item label="内存">
              <Select
                value={form.memory}
                onChange={(memory) =>
                  setForm((current) => ({ ...current, memory }))
                }
                options={["1Gi", "2Gi", "4Gi", "8Gi", "16Gi"]}
              />
            </Form.Item>
            {selected?.description ? (
              <Typography.Paragraph type="secondary">
                {selected.description}
              </Typography.Paragraph>
            ) : null}
          </Form>
        )
      ) : null}

      {step === 1 ? (
        <Form layout="vertical" className="mx-auto max-w-xl">
          <Form.Item label="绝对存活 TTL（SessionTTL）" required>
            <Select
              value={form.sessionTimeout}
              onChange={(sessionTimeout) =>
                setForm((current) => ({ ...current, sessionTimeout }))
              }
              options={["30m", "45m", "60m", "90m", "120m", "240m"]}
            />
          </Form.Item>
          <Form.Item label="空闲超时（SessionIdle）" required>
            <Select
              value={form.idleTimeout}
              onChange={(idleTimeout) =>
                setForm((current) => ({ ...current, idleTimeout }))
              }
              options={["5m", "10m", "15m", "30m", "60m"]}
            />
          </Form.Item>
          <Form.Item label="到期策略" required>
            <Select
              value={form.onTimeout}
              onChange={(onTimeout) =>
                setForm((current) => ({ ...current, onTimeout }))
              }
            >
              <Select.Option value="pause">暂停保留</Select.Option>
              <Select.Option value="kill">直接销毁</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="出口策略 network_egress_policy" required>
            <Select
              value={form.egressPolicy}
              onChange={(egressPolicy) =>
                setForm((current) => ({ ...current, egressPolicy }))
              }
            >
              <Select.Option value="deny_all">
                拒绝全部出站（最严）
              </Select.Option>
              <Select.Option value="allowlist">
                白名单出站（推荐）
              </Select.Option>
              <Select.Option value="internet">可访问公网（试验）</Select.Option>
            </Select>
          </Form.Item>
          {form.egressPolicy === "allowlist" ? (
            <Form.Item label="出口白名单（每行一个 host）" required>
              <Input.TextArea
                value={form.egressAllowlist}
                onChange={(egressAllowlist) =>
                  setForm((current) => ({ ...current, egressAllowlist }))
                }
                autoSize={{ minRows: 3, maxRows: 6 }}
              />
            </Form.Item>
          ) : null}
          <Form.Item label="Runtime Class">
            <Input value="sandbox-kata" readOnly disabled />
          </Form.Item>
          <Form.Item label="自动启动">
            <Switch
              checked={form.autoStart}
              onChange={(autoStart) =>
                setForm((current) => ({ ...current, autoStart }))
              }
            />
          </Form.Item>
          <Alert
            type="info"
            content="Sandbox 不选择安全组，出口能力由 sandbox_config 控制。"
          />
        </Form>
      ) : null}

      {step === 2 ? (
        <Descriptions
          column={1}
          data={[
            { label: "名称", value: form.name || "-" },
            { label: "模板", value: selected?.name ?? "-" },
            {
              label: "镜像",
              value: <ImageNameText image={selected?.image} />,
            },
            { label: "规格", value: `${form.cpu}C / ${form.memory}` },
            {
              label: "会话",
              value: `TTL ${form.sessionTimeout} · 空闲 ${form.idleTimeout} · 到期${form.onTimeout === "kill" ? "销毁" : "暂停"}`,
            },
            { label: "出口策略", value: form.egressPolicy },
            {
              label: "出口白名单",
              value:
                form.egressPolicy === "allowlist"
                  ? form.egressAllowlist
                      .split(/\r?\n/)
                      .filter(Boolean)
                      .join("、")
                  : "-",
            },
            { label: "自动启动", value: form.autoStart ? "是" : "否" },
          ]}
        />
      ) : null}
    </Modal>
  );
}
