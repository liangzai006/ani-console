import {
  Button,
  Collapse,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { applyInstanceLifecycle, createInstance } from "@/api/instances";
import { listNetworkSecurityGroups, listNetworkSubnets, listNetworkVpcs } from "@/api/network";
import { listRegistryImages } from "@/api/registry";
import { listSecrets } from "@/api/secrets";
import { listFilesystems } from "@/api/storage/filesystems";
import { listVolumes } from "@/api/storage/volumes";
import { ImageNameText, WizardSteps } from "@/components/common";
import {
  ContainerSubnetField,
  ContainerVpcField,
} from "@/components/instances/ContainerNetworkFields";
import { InstanceComputeSpecSelect } from "@/components/instances/InstanceComputeSpecSelect";
import { ContainerStorageFields } from "@/components/instances/ContainerStorageFields";
import {
  type ContainerStorageFormValues,
  hasDuplicateContainerMountPath,
} from "@/components/instances/ContainerStorageFields/storage";
import {
  CPU_INSTANCE_COMPUTE_SPECS,
  DEFAULT_CPU_INSTANCE_COMPUTE_SPEC,
  type CpuInstanceComputeSpec,
} from "@/lib/instances";

import styles from "./index.module.css";
import { showMessage } from "@/lib/feedback";
import { withId } from "@/lib/id";
import { validateForm } from "@/lib/form";

const STEP_TITLES = ["基础配置", "资源配置", "摘要信息"];
const CollapseItem = Collapse.Item;

type Item = {
  id: string;
  name?: string | null;
  cidr?: string | null;
  vpc_id?: string | null;
};
type FormValues = ContainerStorageFormValues & {
  name: string;
  description: string;
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
  description: "",
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
    description: values.description.trim() || null,
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
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(INITIAL_VALUES);

  const useListQuery = <T,>(
    key: string,
    feedbackId: string,
    request: () => Promise<{ items: T[] }>,
  ) =>
    useQuery({
      meta: {
        errorNotification: {
          id: feedbackId,
          action: "创建选项加载",
          fallback: "请求失败，请稍后重试",
        },
      },
      queryKey: [key, "container-create"],
      enabled: visible,
      queryFn: async () => (await request()).items,
    });
  const vpcs = useListQuery("network-vpcs", "vpcs", () => listNetworkVpcs({ limit: 100 }));
  const subnets = useListQuery("network-subnets", "subnets", () =>
    listNetworkSubnets({ limit: 100 }),
  );
  const securityGroups = useListQuery("network-security-groups", "security-groups", () =>
    listNetworkSecurityGroups({ limit: 100 }),
  );
  const volumes = useListQuery("volumes", "volumes", () =>
    listVolumes({ limit: 100, in_use: false }),
  );
  const filesystems = useListQuery("filesystems", "filesystems", () =>
    listFilesystems({ limit: 100 }),
  );
  const secrets = useListQuery("secrets", "secrets", () => listSecrets({ limit: 100 }));
  const images = useQuery({
    meta: {
      errorNotification: {
        id: withId("registry-images", "container"),
        action: "容器镜像加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["registry-images", "container-create", "container"],
    enabled: visible,
    queryFn: async () => (await listRegistryImages({ limit: 100, purpose: "container" })).items,
  });
  useEffect(() => {
    if (!visible) return;
    form.setFieldsValue(INITIAL_VALUES);
    setValues(INITIAL_VALUES);
    setStep(0);
  }, [form, visible]);

  const create = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "创建",
        successText: "容器实例创建已提交",
        errorFallback: "创建失败，请检查配置后重试",
      },
    },
    mutationFn: async () => {
      const submitData = buildCreateBody(values);
      const data = await createInstance(submitData);
      const instanceId = data.instance.id;
      if (values.secret_id && instanceId) {
        const bindData = {
          action: "bind_secret" as const,
          secret_id: values.secret_id,
          binding_type: values.secret_binding_type,
        };
        await applyInstanceLifecycle(instanceId, bindData);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["container-instances"] });
      onCreated();
    },
  });

  const close = () => {
    if (create.isPending) return;
    onCancel();
  };
  const next = async () => {
    if (step === 1 && hasDuplicateContainerMountPath(values)) {
      showMessage({ type: "warning", content: "请为块存储卷和文件存储设置不同的挂载路径" });
      return;
    }
    try {
      await validateForm(form);
    } catch {
      return;
    }
    setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
  };
  const itemName = (items: Item[] | undefined, id: string) =>
    (items?.find((item) => item.id === id)?.name ?? id) || "未选择";
  const submit = () => {
    if (hasDuplicateContainerMountPath(values)) {
      setStep(1);
      showMessage({ type: "warning", content: "请为块存储卷和文件存储设置不同的挂载路径" });
      return;
    }
    create.mutate();
  };

  return (
    <Modal
      title="创建容器实例"
      visible={visible}
      onCancel={close}
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
        <WizardSteps current={step + 1} items={STEP_TITLES} size="small" className={styles.steps} />
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
                <Space className={styles.row} size={16} align="start">
                  <InstanceComputeSpecSelect field="compute_spec" profile="cpu" />
                  <Form.Item field="replicas" label="副本数" rules={[{ required: true }]}>
                    <InputNumber min={1} precision={0} />
                  </Form.Item>
                </Space>
                <Form.Item field="description" label="描述">
                  <Input.TextArea
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    placeholder="请输入容器实例描述（可选）"
                    allowClear
                  />
                </Form.Item>
              </>
            ) : null}
            {step === 1 ? (
              <>
                <Space className={styles.row} size={16} align="start">
                  <ContainerVpcField
                    items={vpcs.data ?? []}
                    loading={vpcs.isLoading}
                    allowClear
                    placeholder="使用默认网络"
                    onChange={() => form.setFieldValue("subnet_id", "")}
                  />
                  <ContainerSubnetField
                    items={subnets.data ?? []}
                    vpcId={values.vpc_id}
                    loading={subnets.isLoading}
                    allowClear
                  />
                </Space>
                <Form.Item field="security_group_id" label="安全组">
                  <Select allowClear loading={securityGroups.isLoading}>
                    {securityGroups.data?.map((item) => (
                      <Select.Option key={item.id} value={item.id}>
                        {item.name ?? item.id}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <ContainerStorageFields
                  values={values}
                  volumes={volumes.data}
                  filesystems={filesystems.data}
                />

                <Collapse className={styles.advancedOptions}>
                  <CollapseItem header="运行配置" name="runtime-options">
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
                  </CollapseItem>
                </Collapse>
              </>
            ) : null}
            {step === 2 ? (
              <Descriptions
                column={1}
                border
                data={[
                  { label: "名称", value: values.name },
                  { label: "描述", value: values.description.trim() || "-" },
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
