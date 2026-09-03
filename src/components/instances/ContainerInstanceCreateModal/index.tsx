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
  Steps,
  Switch,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { newIdempotencyKey } from "@/lib/idempotency";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import styles from "./index.module.css";

const STEP_TITLES = ["基本信息", "资源规格", "网络", "存储与挂载", "配置与密钥", "确认"];

type Item = { id: string; name?: string | null; cidr?: string | null; vpc_id?: string | null };
type RegistryImage = { image: string; repository: string; tag: string };
type FormValues = {
  name: string;
  image: string;
  cpu: string;
  memory: string;
  replicas: number;
  vpc_id: string;
  subnet_id: string;
  security_group_id: string;
  volume_id: string;
  filesystem_id: string;
  mount_path: string;
  read_only: boolean;
  env_text: string;
  secret_id: string;
  secret_binding_type: "env" | "file";
  auto_start: boolean;
};

const INITIAL_VALUES: FormValues = {
  name: "",
  image: "",
  cpu: "2",
  memory: "4Gi",
  replicas: 1,
  vpc_id: "",
  subnet_id: "",
  security_group_id: "",
  volume_id: "",
  filesystem_id: "",
  mount_path: "/data",
  read_only: false,
  env_text: "",
  secret_id: "",
  secret_binding_type: "env",
  auto_start: true,
};

function parseEnv(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const separator = line.indexOf("=");
    return separator > 0 ? { name: line.slice(0, separator), value: line.slice(separator + 1) } : null;
  }).filter((item): item is { name: string; value: string } => item !== null);
}

function buildCreateBody(values: FormValues, idempotencyKey: string) {
  const mountPath = values.mount_path.trim() || "/data";
  return {
    idempotency_key: idempotencyKey,
    name: values.name.trim(),
    kind: "container" as const,
    instance_type: "container" as const,
    image: values.image,
    image_ref: values.image,
    cpu: values.cpu.trim(),
    memory: values.memory.trim(),
    auto_start: values.auto_start,
    ssh_username: null,
    termination_protection: false,
    replicas: values.replicas,
    container_config: {
      replicas: values.replicas,
      network: values.vpc_id && values.subnet_id ? {
        vpc_id: values.vpc_id,
        subnet_id: values.subnet_id,
        security_group_ids: values.security_group_id ? [values.security_group_id] : [],
      } : undefined,
      env: parseEnv(values.env_text),
      volume_mounts: values.volume_id ? [{ volume_id: values.volume_id, mount_path: mountPath, read_only: values.read_only }] : [],
      filesystem_mounts: values.filesystem_id ? [{ filesystem_id: values.filesystem_id, mount_path: mountPath, read_only: values.read_only }] : [],
    },
  };
}

export function ContainerInstanceCreateModal({ visible, onCancel, onCreated }: {
  visible: boolean;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());

  const useListQuery = (path: string, key: string) => useQuery({
    queryKey: [key, "container-create"], enabled: visible,
    queryFn: async () => {
      const request = coreApi.GET as unknown as (path: string, options: { params: { query: never } }) => Promise<{ data?: { items?: Item[] }; error?: unknown }>;
      const { data, error } = await request(path, { params: { query: asUncontractedQuery({ limit: 100 }) } });
      if (error) throw error;
      return data?.items ?? [];
    },
  });
  const vpcs = useListQuery("/networks/vpcs", "network-vpcs");
  const subnets = useListQuery("/networks/subnets", "network-subnets");
  const securityGroups = useListQuery("/networks/security-groups", "network-security-groups");
  const volumes = useListQuery("/volumes", "volumes");
  const filesystems = useListQuery("/filesystems", "filesystems");
  const secrets = useListQuery("/secrets", "secrets");
  const images = useQuery({
    queryKey: ["registry-images", "container-create"], enabled: visible,
    queryFn: async () => {
      const request = coreApi.GET as unknown as (path: string, options: { params: { query: never } }) => Promise<{ data?: { items?: RegistryImage[] }; error?: unknown }>;
      const { data, error } = await request("/registry/images", { params: { query: asUncontractedQuery({ limit: 100 }) } });
      if (error) throw error;
      return data?.items ?? [];
    },
  });
  const availableSubnets = useMemo(() => subnets.data?.filter((item) => !values.vpc_id || item.vpc_id === values.vpc_id) ?? [], [subnets.data, values.vpc_id]);

  useEffect(() => {
    if (!visible) return;
    form.setFieldsValue(INITIAL_VALUES);
    setValues(INITIAL_VALUES);
    setStep(0);
  }, [form, visible]);

  const create = useMutation({
    mutationFn: async () => {
      const request = coreApi.POST as unknown as (path: string, options: { body: ReturnType<typeof buildCreateBody> }) => Promise<{ data?: { instance?: { id?: string } }; error?: unknown; response: Response }>;
      const { data, error, response } = await request("/instances", { body: buildCreateBody(values, idempotencyKey) });
      if (error) throw { ...(typeof error === "object" && error ? error : { message: String(error) }), status: response.status };
      const instanceId = data?.instance?.id;
      if (values.secret_id && instanceId) {
        const { error: bindingError, response: bindingResponse } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
          params: { path: { instance_id: instanceId } },
          body: { action: "bind_secret", idempotency_key: newIdempotencyKey(), secret_id: values.secret_id, binding_type: values.secret_binding_type },
        });
        if (bindingError) throw { ...(typeof bindingError === "object" && bindingError ? bindingError : { message: String(bindingError) }), status: bindingResponse.status };
      }
    },
    onSuccess: () => {
      Message.success("容器实例创建已提交");
      setIdempotencyKey(newIdempotencyKey());
      void queryClient.invalidateQueries({ queryKey: ["container-instances"] });
      onCreated();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "create")),
  });

  const close = () => {
    if (create.isPending) return;
    setIdempotencyKey(newIdempotencyKey());
    onCancel();
  };
  const next = async () => {
    try {
      await form.validate();
      setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
    } catch { Message.warning("请先完成当前步骤的必填项"); }
  };
  const itemName = (items: Item[] | undefined, id: string) => (items?.find((item) => item.id === id)?.name ?? id) || "未选择";

  return <Modal title="创建容器实例" visible={visible} onCancel={close} maskClosable={!create.isPending} unmountOnExit footer={null} style={{ width: 820, height: 720 }}>
    <div className={styles.form}>
      <Steps current={step + 1} style={{ marginBottom: 24 }}>{STEP_TITLES.map((title) => <Steps.Step key={title} title={title} />)}</Steps>
      <div className={styles.content}>
        <Form<FormValues> form={form} layout="vertical" initialValues={INITIAL_VALUES} requiredSymbol={{ position: "end" }} onValuesChange={(changed) => setValues((current) => ({ ...current, ...changed }))}>
          {step === 0 ? <><Typography.Paragraph type="secondary">设置实例名称并选择运行镜像。</Typography.Paragraph><Form.Item field="name" label="名称" rules={[{ required: true, message: "请输入名称" }]}><Input allowClear /></Form.Item><Form.Item field="image" label="镜像" rules={[{ required: true, message: "请选择镜像" }]}><Select loading={images.isLoading} showSearch placeholder="选择容器镜像">{images.data?.map((item) => <Select.Option key={item.image} value={item.image}>{item.repository}:{item.tag}</Select.Option>)}</Select></Form.Item></> : null}
          {step === 1 ? <><Form.Item field="cpu" label="CPU" rules={[{ required: true }]}><Input placeholder="2" /></Form.Item><Form.Item field="memory" label="内存" rules={[{ required: true }]}><Input placeholder="4Gi" /></Form.Item><Form.Item field="replicas" label="副本数" rules={[{ required: true }]}><InputNumber min={1} precision={0} /></Form.Item></> : null}
          {step === 2 ? <><Form.Item field="vpc_id" label="VPC"><Select allowClear loading={vpcs.isLoading} onChange={() => form.setFieldValue("subnet_id", "")} placeholder="使用默认网络">{vpcs.data?.map((item) => <Select.Option key={item.id} value={item.id}>{item.name ?? item.id}{item.cidr ? ` · ${item.cidr}` : ""}</Select.Option>)}</Select></Form.Item><Form.Item field="subnet_id" label="子网"><Select allowClear disabled={!values.vpc_id} loading={subnets.isLoading}>{availableSubnets.map((item) => <Select.Option key={item.id} value={item.id}>{item.name ?? item.id}</Select.Option>)}</Select></Form.Item><Form.Item field="security_group_id" label="安全组"><Select allowClear loading={securityGroups.isLoading}>{securityGroups.data?.map((item) => <Select.Option key={item.id} value={item.id}>{item.name ?? item.id}</Select.Option>)}</Select></Form.Item></> : null}
          {step === 3 ? <><Form.Item field="volume_id" label="块存储卷"><Select allowClear placeholder="不挂载块存储">{volumes.data?.map((item) => <Select.Option key={item.id} value={item.id}>{item.name ?? item.id}</Select.Option>)}</Select></Form.Item><Form.Item field="filesystem_id" label="文件存储"><Select allowClear placeholder="不挂载文件存储">{filesystems.data?.map((item) => <Select.Option key={item.id} value={item.id}>{item.name ?? item.id}</Select.Option>)}</Select></Form.Item><Form.Item field="mount_path" label="挂载路径"><Input placeholder="/data" /></Form.Item><Form.Item field="read_only" label="只读挂载" triggerPropName="checked"><Switch /></Form.Item></> : null}
          {step === 4 ? <><Form.Item field="env_text" label="环境变量"><Input.TextArea placeholder={"KEY=VALUE\nAPP_ENV=production"} autoSize={{ minRows: 4, maxRows: 8 }} /></Form.Item><Form.Item field="secret_id" label="密钥"><Select allowClear placeholder="不绑定密钥">{secrets.data?.map((item) => <Select.Option key={item.id} value={item.id}>{item.name ?? item.id}</Select.Option>)}</Select></Form.Item>{values.secret_id ? <Form.Item field="secret_binding_type" label="密钥注入方式"><Select><Select.Option value="env">环境变量</Select.Option><Select.Option value="file">文件</Select.Option></Select></Form.Item> : null}<Form.Item field="auto_start" label="自动启动" triggerPropName="checked"><Switch /></Form.Item></> : null}
          {step === 5 ? <Descriptions column={2} border data={[{ label: "名称", value: values.name }, { label: "镜像", value: values.image }, { label: "规格", value: `${values.cpu} / ${values.memory}` }, { label: "副本", value: values.replicas }, { label: "VPC", value: itemName(vpcs.data, values.vpc_id) }, { label: "子网", value: itemName(subnets.data, values.subnet_id) }, { label: "块存储", value: itemName(volumes.data, values.volume_id) }, { label: "文件存储", value: itemName(filesystems.data, values.filesystem_id) }, { label: "挂载路径", value: values.mount_path || "-" }, { label: "密钥", value: itemName(secrets.data, values.secret_id) }, { label: "自动启动", value: values.auto_start ? "是" : "否" }]} /> : null}
        </Form>
      </div>
      <div className={styles.actions}><Space><Button onClick={close} disabled={create.isPending}>取消</Button>{step > 0 ? <Button onClick={() => setStep((current) => current - 1)} disabled={create.isPending}>上一步</Button> : null}<Button type="primary" loading={create.isPending} onClick={step === STEP_TITLES.length - 1 ? () => create.mutate() : next}>{step === STEP_TITLES.length - 1 ? "提交创建" : "下一步"}</Button></Space></div>
    </div>
  </Modal>;
}
