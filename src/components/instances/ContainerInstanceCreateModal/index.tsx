import {
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Select,
  Space,
  Switch,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { ImageNameText, WizardSteps } from "@/components/common";
import { InstanceComputeSpecSelect } from "@/components/instances/InstanceComputeSpecSelect";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import {
  CPU_INSTANCE_COMPUTE_SPECS,
  DEFAULT_CPU_INSTANCE_COMPUTE_SPEC,
  type CpuInstanceComputeSpec,
} from "@/lib/instance-compute-specs";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { ContainerStorageFields } from "./ContainerStorageFields";
import {
  type ContainerStorageFormValues,
  hasDuplicateContainerMountPath,
} from "./ContainerStorageFields/storage";
import styles from "./index.module.css";

const STEP_TITLES = ["基本信息", "资源规格", "网络", "存储与挂载", "配置与密钥", "确认"];

type Item = {
  id: string;
  name?: string | null;
  cidr?: string | null;
  vpc_id?: string | null;
};
type RegistryImage = {
  image: string;
  name?: string | null;
  repository: string;
  tag: string;
  size_bytes?: number | null;
};
type FormValues = ContainerStorageFormValues & {
  name: string;
  image: string;
  compute_spec: CpuInstanceComputeSpec;
  replicas: number;
  vpc_id: string;
  subnet_id: string;
  security_group_id: string;
  env_text: string;
  secret_id: string;
  secret_binding_type: "env" | "file";
  auto_start: boolean;
};

const INITIAL_VALUES: FormValues = {
  name: "",
  image: "",
  compute_spec: DEFAULT_CPU_INSTANCE_COMPUTE_SPEC,
  replicas: 1,
  vpc_id: "",
  subnet_id: "",
  security_group_id: "",
  volume_id: "",
  filesystem_id: "",
  volume_mount_path: "/data",
  volume_read_only: false,
  filesystem_mount_path: "/data",
  filesystem_read_only: false,
  env_text: "",
  secret_id: "",
  secret_binding_type: "env",
  auto_start: true,
};

function parseEnv(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("=");
      return separator > 0
        ? { name: line.slice(0, separator), value: line.slice(separator + 1) }
        : null;
    })
    .filter((item): item is { name: string; value: string } => item !== null);
}

function buildCreateBody(values: FormValues) {
  const computeSpec =
    CPU_INSTANCE_COMPUTE_SPECS.find((option) => option.value === values.compute_spec) ??
    CPU_INSTANCE_COMPUTE_SPECS[1];

  return {
    name: values.name.trim(),
    kind: "container" as const,
    instance_type: "container" as const,
    image: values.image,
    image_ref: values.image,
    cpu: computeSpec.cpu,
    memory: computeSpec.memory,
    auto_start: values.auto_start,
    ssh_username: null,
    termination_protection: false,
    replicas: values.replicas,
    container_config: {
      replicas: values.replicas,
      network:
        values.vpc_id && values.subnet_id
          ? {
              vpc_id: values.vpc_id,
              subnet_id: values.subnet_id,
              security_group_ids: values.security_group_id ? [values.security_group_id] : [],
            }
          : undefined,
      env: parseEnv(values.env_text),
      volume_mounts: values.volume_id
        ? [
            {
              volume_id: values.volume_id,
              mount_path: values.volume_mount_path.trim(),
              read_only: values.volume_read_only,
            },
          ]
        : [],
      filesystem_mounts: values.filesystem_id
        ? [
            {
              filesystem_id: values.filesystem_id,
              mount_path: values.filesystem_mount_path.trim(),
              read_only: values.filesystem_read_only,
            },
          ]
        : [],
    },
  };
}

export function ContainerInstanceCreateModal({
  visible,
  onCancel,
  onCreated,
}: {
  visible: boolean;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const queryClient = useQueryClient();
  const createScope = useIdempotencyScope("container-instance-create", ["POST"]);
  const bindSecretScope = useIdempotencyScope("container-instance-secret-bind", ["POST"]);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(INITIAL_VALUES);

  const useListQuery = (path: string, key: string, query?: Record<string, unknown>) =>
    useQuery({
      queryKey: query ? [key, "container-create", query] : [key, "container-create"],
      enabled: visible,
      queryFn: async () => {
        const request = coreApi.GET as unknown as (
          path: string,
          options: { params: { query: never } },
        ) => Promise<{ data?: { items?: Item[] }; error?: unknown }>;
        const { data, error } = await request(path, {
          params: {
            query: asUncontractedQuery({ limit: 100, ...(query ?? {}) }),
          },
        });
        if (error) throw error;
        return data?.items ?? [];
      },
    });
  const vpcs = useListQuery("/networks/vpcs", "network-vpcs");
  const subnets = useListQuery("/networks/subnets", "network-subnets");
  const securityGroups = useListQuery("/networks/security-groups", "network-security-groups");
  const volumes = useListQuery("/volumes", "volumes", { in_use: false });
  const filesystems = useListQuery("/filesystems", "filesystems");
  const secrets = useListQuery("/secrets", "secrets");
  const images = useQuery({
    queryKey: ["registry-images", "container-create", "container"],
    enabled: visible,
    queryFn: async () => {
      const request = coreApi.GET as unknown as (
        path: string,
        options: { params: { query: never } },
      ) => Promise<{ data?: { items?: RegistryImage[] }; error?: unknown }>;
      const { data, error } = await request("/registry/images", {
        params: {
          query: asUncontractedQuery({ limit: 100, purpose: "container" }),
        },
      });
      if (error) throw error;
      return data?.items ?? [];
    },
  });
  const availableSubnets = useMemo(
    () => subnets.data?.filter((item) => !values.vpc_id || item.vpc_id === values.vpc_id) ?? [],
    [subnets.data, values.vpc_id],
  );

  useEffect(() => {
    if (!visible) return;
    form.setFieldsValue(INITIAL_VALUES);
    setValues(INITIAL_VALUES);
    setStep(0);
  }, [form, visible]);

  const create = useMutation({
    mutationFn: async () => {
      const request = coreApi.POST as unknown as (
        path: string,
        options: {
          body: ReturnType<typeof buildCreateBody> & {
            idempotency_key: string;
          };
        },
      ) => Promise<{
        data?: { instance?: { id?: string } };
        error?: unknown;
        response: Response;
      }>;
      const submitData = buildCreateBody(values);
      const { data, error, response } = await request("/instances", {
        body: createScope.withKey(submitData),
      });
      if (error)
        throw {
          ...(typeof error === "object" && error ? error : { message: String(error) }),
          status: response.status,
        };
      const instanceId = data?.instance?.id;
      if (values.secret_id && instanceId) {
        const bindData = {
          action: "bind_secret" as const,
          secret_id: values.secret_id,
          binding_type: values.secret_binding_type,
        };
        const { error: bindingError, response: bindingResponse } = await coreApi.POST(
          "/instances/{instance_id}/lifecycle",
          {
            params: { path: { instance_id: instanceId } },
            body: bindSecretScope.withKey(bindData, [instanceId]),
          },
        );
        if (bindingError)
          throw {
            ...(typeof bindingError === "object" && bindingError
              ? bindingError
              : { message: String(bindingError) }),
            status: bindingResponse.status,
          };
      }
    },
    onSuccess: () => {
      createScope.reset();
      bindSecretScope.reset();
      Message.success("容器实例创建已提交");
      void queryClient.invalidateQueries({ queryKey: ["container-instances"] });
      onCreated();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "create")),
  });

  const close = () => {
    if (create.isPending) return;
    createScope.reset();
    bindSecretScope.reset();
    onCancel();
  };
  const next = async () => {
    if (step === 3 && hasDuplicateContainerMountPath(values)) {
      Message.warning("请为块存储卷和文件存储设置不同的挂载路径");
      return;
    }
    try {
      await form.validate();
      setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
    } catch {
      Message.warning("请先完成当前步骤的必填项");
    }
  };
  const itemName = (items: Item[] | undefined, id: string) =>
    (items?.find((item) => item.id === id)?.name ?? id) || "未选择";
  const submit = () => {
    if (hasDuplicateContainerMountPath(values)) {
      setStep(3);
      Message.warning("请为块存储卷和文件存储设置不同的挂载路径");
      return;
    }
    create.mutate();
  };

  return (
    <Modal
      title="创建容器实例"
      visible={visible}
      onCancel={close}
      maskClosable={!create.isPending}
      unmountOnExit
      footer={
        <Space>
          <Button onClick={close} disabled={create.isPending}>
            取消
          </Button>
          {step > 0 ? (
            <Button onClick={() => setStep((current) => current - 1)} disabled={create.isPending}>
              上一步
            </Button>
          ) : null}
          <Button
            type="primary"
            loading={create.isPending}
            onClick={step === STEP_TITLES.length - 1 ? submit : next}
          >
            {step === STEP_TITLES.length - 1 ? "提交创建" : "下一步"}
          </Button>
        </Space>
      }
      style={{ width: 820 }}
    >
      <div className={styles.form}>
        <WizardSteps current={step + 1} items={STEP_TITLES} style={{ marginBottom: 24 }} />
        <div className={styles.content}>
          <Form<FormValues>
            form={form}
            layout="vertical"
            initialValues={INITIAL_VALUES}
            requiredSymbol={{ position: "end" }}
            onValuesChange={(changed) => setValues((current) => ({ ...current, ...changed }))}
          >
            {step === 0 ? (
              <>
                <Typography.Paragraph type="secondary">
                  设置实例名称并选择运行镜像。
                </Typography.Paragraph>
                <Form.Item
                  field="name"
                  label="名称"
                  rules={[{ required: true, message: "请输入名称" }]}
                >
                  <Input allowClear />
                </Form.Item>
                <Form.Item
                  field="image"
                  label="镜像"
                  rules={[{ required: true, message: "请选择镜像" }]}
                >
                  <Select loading={images.isLoading} showSearch placeholder="选择容器镜像">
                    {images.data?.map((item) => (
                      <Select.Option key={item.image} value={item.image}>
                        <ImageNameText image={item} showSize />
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </>
            ) : null}
            {step === 1 ? (
              <>
                <InstanceComputeSpecSelect field="compute_spec" profile="cpu" />
                <Form.Item field="replicas" label="副本数" rules={[{ required: true }]}>
                  <InputNumber min={1} precision={0} />
                </Form.Item>
              </>
            ) : null}
            {step === 2 ? (
              <>
                <Form.Item field="vpc_id" label="VPC">
                  <Select
                    allowClear
                    loading={vpcs.isLoading}
                    onChange={() => form.setFieldValue("subnet_id", "")}
                    placeholder="使用默认网络"
                  >
                    {vpcs.data?.map((item) => (
                      <Select.Option key={item.id} value={item.id}>
                        {item.name ?? item.id}
                        {item.cidr ? ` · ${item.cidr}` : ""}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item field="subnet_id" label="子网">
                  <Select allowClear disabled={!values.vpc_id} loading={subnets.isLoading}>
                    {availableSubnets.map((item) => (
                      <Select.Option key={item.id} value={item.id}>
                        {item.name ?? item.id}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item field="security_group_id" label="安全组">
                  <Select allowClear loading={securityGroups.isLoading}>
                    {securityGroups.data?.map((item) => (
                      <Select.Option key={item.id} value={item.id}>
                        {item.name ?? item.id}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </>
            ) : null}
            {step === 3 ? (
              <ContainerStorageFields
                values={values}
                volumes={volumes.data}
                filesystems={filesystems.data}
              />
            ) : null}
            {step === 4 ? (
              <>
                <Form.Item field="env_text" label="环境变量">
                  <Input.TextArea
                    placeholder={"KEY=VALUE\nAPP_ENV=production"}
                    autoSize={{ minRows: 4, maxRows: 8 }}
                  />
                </Form.Item>
                <Form.Item field="secret_id" label="密钥">
                  <Select allowClear placeholder="不绑定密钥">
                    {secrets.data?.map((item) => (
                      <Select.Option key={item.id} value={item.id}>
                        {item.name ?? item.id}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                {values.secret_id ? (
                  <Form.Item field="secret_binding_type" label="密钥注入方式">
                    <Select>
                      <Select.Option value="env">环境变量</Select.Option>
                      <Select.Option value="file">文件</Select.Option>
                    </Select>
                  </Form.Item>
                ) : null}
                <Form.Item field="auto_start" label="自动启动" triggerPropName="checked">
                  <Switch />
                </Form.Item>
              </>
            ) : null}
            {step === 5 ? (
              <Descriptions
                column={1}
                border
                data={[
                  { label: "名称", value: values.name },
                  {
                    label: "镜像",
                    value: (
                      <ImageNameText
                        image={
                          images.data?.find((item) => item.image === values.image) ?? values.image
                        }
                        showSize
                      />
                    ),
                  },
                  { label: "规格", value: values.compute_spec },
                  { label: "副本", value: values.replicas },
                  { label: "VPC", value: itemName(vpcs.data, values.vpc_id) },
                  {
                    label: "子网",
                    value: itemName(subnets.data, values.subnet_id),
                  },
                  {
                    label: "块存储",
                    value: itemName(volumes.data, values.volume_id),
                  },
                  {
                    label: "块存储挂载",
                    value: values.volume_id
                      ? `${values.volume_mount_path || "-"} · ${values.volume_read_only ? "只读" : "读写"}`
                      : "-",
                  },
                  {
                    label: "文件存储",
                    value: itemName(filesystems.data, values.filesystem_id),
                  },
                  {
                    label: "文件存储挂载",
                    value: values.filesystem_id
                      ? `${values.filesystem_mount_path || "-"} · ${values.filesystem_read_only ? "只读" : "读写"}`
                      : "-",
                  },
                  {
                    label: "密钥",
                    value: itemName(secrets.data, values.secret_id),
                  },
                  { label: "自动启动", value: values.auto_start ? "是" : "否" },
                ]}
              />
            ) : null}
          </Form>
        </div>
      </div>
    </Modal>
  );
}
