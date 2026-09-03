import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  Message,
  Modal,
  Radio,
  Select,
  Space,
  Steps,
  Switch,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { coreApi } from "@/api/client";
import type { components } from "@/api/core-schema";
import { ImageNameText, Ipv4CidrInput } from "@/components/common";
import { listOrThrow } from "@/lib/api-list";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import {
  optionalIpv4WithinCidrError,
  subnetFixedOctets,
  suggestGatewayIp,
} from "@/lib/validators";
import styles from "./index.module.css";

type Request = components["schemas"]["CreateInstanceRequest"];
type SecurityGroup = components["schemas"]["NetworkSecurityGroup"];
type Filesystem = components["schemas"]["StorageFilesystem"];
type Secret = components["schemas"]["Secret"];
type RegistryImage = {
  image: string;
  name?: string | null;
  purpose?: string;
  project: string;
  repository: string;
  tag: string;
  size_bytes?: number | null;
};
type RegistryImageListResponse = { items: RegistryImage[]; total: number };
type DiskOption = "40-ssd" | "80-ssd" | "100-hdd";
type DataDiskOption = "none" | "100-ssd" | "200-ssd";
type SpecOption = "2c4g" | "4c8g" | "8c16g" | "16c64g";
type VmConfig = {
  boot_image: string;
  user_data?: string;
  ssh_username: string;
  ssh_key_ref?: string;
  password_secret_ref?: string;
  network: {
    vpc_id: string;
    subnet_id: string;
    security_group_ids: string[];
    assign_private_ip: boolean;
    private_ip?: string;
  };
  system_disk: {
    size_gib: number;
    volume_type: string;
    delete_on_failure: boolean;
    delete_with_instance: boolean;
  };
  data_disks: Array<{
    size_gib: number;
    volume_type: string;
    delete_on_failure: boolean;
    delete_with_instance: boolean;
  }>;
  filesystem_mounts: Array<{
    filesystem_id: string;
    mount_path: string;
    read_only: boolean;
  }>;
};
type ExtendedRequest = Request & { image_ref: string; vm_config: VmConfig };
type Values = {
  name: string;
  imageRef: string;
  userData: string;
  spec: SpecOption;
  vpcId: string;
  subnetId: string;
  securityGroupIds: string[];
  ipMode: "auto" | "manual";
  privateIp: string;
  loginMode: "ssh-key" | "password";
  sshUsername: string;
  sshKeyRef: string;
  passwordSecretRef: string;
  systemDisk: DiskOption;
  dataDisk: DataDiskOption;
  filesystemId: string;
  autoStart: boolean;
  terminationProtection: boolean;
};

const INITIAL: Values = {
  name: "",
  imageRef: "",
  userData: "",
  spec: "4c8g",
  vpcId: "",
  subnetId: "",
  securityGroupIds: [],
  ipMode: "auto",
  privateIp: "",
  loginMode: "ssh-key",
  sshUsername: "ubuntu",
  sshKeyRef: "",
  passwordSecretRef: "",
  systemDisk: "40-ssd",
  dataDisk: "none",
  filesystemId: "",
  autoStart: true,
  terminationProtection: false,
};
const STEPS = [
  "基础信息",
  "镜像配置",
  "规格",
  "网络与 SSH",
  "磁盘与高级确认",
];
const SPECS: Record<
  SpecOption,
  { label: string; cpu: string; memory: string }
> = {
  "2c4g": { label: "2C4G", cpu: "2", memory: "4Gi" },
  "4c8g": { label: "4C8G", cpu: "4", memory: "8Gi" },
  "8c16g": { label: "8C16G", cpu: "8", memory: "16Gi" },
  "16c64g": { label: "16C64G", cpu: "16", memory: "64Gi" },
};
const SYSTEM_DISKS: Record<
  DiskOption,
  { label: string; size: number; type: string }
> = {
  "40-ssd": { label: "40Gi · SSD", size: 40, type: "ssd" },
  "80-ssd": { label: "80Gi · SSD", size: 80, type: "ssd" },
  "100-hdd": { label: "100Gi · HDD", size: 100, type: "hdd" },
};
const DATA_DISKS: Record<
  Exclude<DataDiskOption, "none">,
  { label: string; size: number; type: string }
> = {
  "100-ssd": { label: "100Gi · SSD", size: 100, type: "ssd" },
  "200-ssd": { label: "200Gi · SSD", size: 200, type: "ssd" },
};
const optional = (value: string) => value.trim() || undefined;

export function VmInstanceCreateModal({
  visible,
  onCancel,
  onCreated,
}: {
  visible: boolean;
  onCancel: () => void;
  onCreated: (operationId?: string) => void;
}) {
  const [form] = Form.useForm<Values>();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(INITIAL);
  const queryClient = useQueryClient();
  const createScope = useIdempotencyScope("vm-instance-create", ["POST"]);

  useEffect(() => {
    if (!visible) return;
    createScope.reset();
    form.setFieldsValue(INITIAL);
    setValues(INITIAL);
    setStep(0);
  }, [createScope, form, visible]);

  const images = useQuery({
    queryKey: ["registry-images", "vm-create", "system"],
    enabled: visible,
    queryFn: async () => {
      const request = coreApi.GET as unknown as (
        path: string,
        options: unknown,
      ) => Promise<{ data?: RegistryImageListResponse; error?: unknown }>;
      const { data, error } = await request("/registry/images", {
        params: { query: { limit: 100 } },
      });
      if (error) throw error;
      // TODO: Registry 后端修正镜像类型字段并支持 purpose 筛选后，仅展示系统镜像。
      return data?.items ?? [];
    },
  });
  const vpcs = useQuery({
    queryKey: ["network-vpcs", "vm-create"],
    enabled: visible,
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/vpcs", { params: { query: { limit: 100 } } }),
      ),
  });
  const subnets = useQuery({
    queryKey: ["network-subnets", "vm-create", values.vpcId],
    enabled: visible && !!values.vpcId,
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/subnets", {
          params: { query: { limit: 100, vpc_id: values.vpcId } },
        }),
      ),
  });
  const securityGroups = useQuery({
    queryKey: ["network-security-groups", "vm-create", values.vpcId],
    enabled: visible && !!values.vpcId,
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/security-groups", {
          params: { query: { limit: 100, vpc_id: values.vpcId } },
        }),
      ),
  });
  const filesystems = useQuery({
    queryKey: ["filesystems", "vm-create"],
    enabled: visible,
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/filesystems", { params: { query: { limit: 100 } } }),
      ),
  });
  const secrets = useQuery({
    queryKey: ["secrets", "vm-create"],
    enabled: visible,
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/secrets", { params: { query: { limit: 100 } } }),
      ),
  });
  const availableSubnets = (subnets.data?.items ?? []).filter(
    (item) => item.vpc_id === values.vpcId,
  );
  const availableSecurityGroups = (
    (securityGroups.data?.items ?? []) as SecurityGroup[]
  ).filter((item) => !item.vpc_id || item.vpc_id === values.vpcId);
  const selectedSubnet = availableSubnets.find(
    (item) => String(item.id) === values.subnetId,
  );
  const subnetCidr = selectedSubnet?.cidr ? String(selectedSubnet.cidr) : "";
  const privateIpError =
    values.ipMode === "manual" && values.privateIp && subnetCidr
      ? optionalIpv4WithinCidrError(
          values.privateIp,
          subnetCidr,
          "固定 IP",
          "子网 CIDR",
        )
      : undefined;
  const activeSecrets = ((secrets.data?.items ?? []) as Secret[]).filter(
    (secret) => secret.state !== "deleted" && secret.id,
  );
  const sshSecrets = activeSecrets.filter((secret) =>
    /ssh|key/i.test(secret.type ?? ""),
  );
  const passwordSecrets = activeSecrets.filter((secret) =>
    /password|credential/i.test(secret.type ?? ""),
  );

  const create = useMutation({
    mutationFn: async () => {
      const spec = SPECS[values.spec];
      const systemDisk = SYSTEM_DISKS[values.systemDisk];
      const dataDisk =
        values.dataDisk === "none" ? undefined : DATA_DISKS[values.dataDisk];
      const vmConfig: VmConfig = {
        boot_image: values.imageRef,
        user_data: optional(values.userData),
        ssh_username: values.sshUsername.trim(),
        ssh_key_ref:
          values.loginMode === "ssh-key" ? values.sshKeyRef : undefined,
        password_secret_ref:
          values.loginMode === "password"
            ? values.passwordSecretRef
            : undefined,
        network: {
          vpc_id: values.vpcId,
          subnet_id: values.subnetId,
          security_group_ids: values.securityGroupIds,
          assign_private_ip: values.ipMode === "auto",
          private_ip:
            values.ipMode === "manual" ? optional(values.privateIp) : undefined,
        },
        system_disk: {
          size_gib: systemDisk.size,
          volume_type: systemDisk.type,
          delete_on_failure: true,
          delete_with_instance: true,
        },
        data_disks: dataDisk
          ? [
              {
                size_gib: dataDisk.size,
                volume_type: dataDisk.type,
                delete_on_failure: true,
                delete_with_instance: false,
              },
            ]
          : [],
        filesystem_mounts: values.filesystemId
          ? [
              {
                filesystem_id: values.filesystemId,
                mount_path: "/mnt/nfs",
                read_only: false,
              },
            ]
          : [],
      };
      const submitData = {
        name: values.name.trim(),
        kind: "vm" as const,
        instance_type: "vm" as const,
        replicas: 1,
        cpu: spec.cpu,
        memory: spec.memory,
        auto_start: values.autoStart,
        termination_protection: values.terminationProtection,
        boot_image: values.imageRef,
        image_ref: values.imageRef,
        ssh_username: values.sshUsername.trim(),
        ssh_key_ref: values.loginMode === "ssh-key" ? values.sshKeyRef : null,
        vm_config: vmConfig,
      };
      const body = createScope.withKey(submitData) as ExtendedRequest;
      const { data, error, response } = await coreApi.POST("/instances", {
        body,
      });
      if (error)
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error) }),
          status: response.status,
        };
      return data?.operation_id;
    },
    onSuccess: async (operationId) => {
      createScope.reset();
      Message.success("云主机创建已提交");
      await queryClient.invalidateQueries({ queryKey: ["vm-instances"] });
      onCreated(operationId);
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "create")),
  });

  const next = async () => {
    try {
      await form.validate();
      if (step === 1 && !values.imageRef) throw new Error();
      if (
        step === 3 &&
        (!values.vpcId || !values.subnetId || !values.securityGroupIds.length)
      )
        throw new Error();
      if (
        step === 3 &&
        values.ipMode === "manual" &&
        (!values.privateIp || privateIpError)
      )
        throw new Error();
      if (step === 3 && values.loginMode === "ssh-key" && !values.sshKeyRef)
        throw new Error();
      if (
        step === 3 &&
        values.loginMode === "password" &&
        !values.passwordSecretRef
      )
        throw new Error();
      setStep((current) => Math.min(STEPS.length - 1, current + 1));
    } catch {
      Message.warning("请先完成当前步骤的必填项");
    }
  };
  const setValue = <K extends keyof Values>(key: K, value: Values[K]) => {
    form.setFieldValue(key, value);
    setValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <Modal
      title="创建云主机 VM"
      visible={visible}
      onCancel={() => {
        createScope.reset();
        onCancel();
      }}
      footer={null}
      unmountOnExit
      maskClosable={!create.isPending}
      style={{ width: 820 }}
    >
      <div className={styles.form}>
        <Steps current={step + 1}>
          {STEPS.map((title) => (
            <Steps.Step key={title} title={title} />
          ))}
        </Steps>
        <div className={styles.content}>
          <Form
            form={form}
            layout="vertical"
            initialValues={INITIAL}
            onValuesChange={(changed) =>
              setValues((current) => ({ ...current, ...changed }))
            }
          >
            {step === 0 ? (
              <>
                <Form.Item
                  field="name"
                  label="名称"
                  rules={[{ required: true, message: "请输入云主机名称" }]}
                >
                  <Input placeholder="例如 production-web-01" allowClear />
                </Form.Item>
                <Form.Item label="台数">
                  <Input value="1" disabled />
                </Form.Item>
              </>
            ) : null}
            {step === 1 ? (
              <>
                <Form.Item
                  field="imageRef"
                  label="启动镜像（系统镜像）"
                  required
                >
                  <Select
                    loading={images.isLoading}
                    placeholder="选择 Registry 中的 system 镜像"
                    showSearch
                    allowClear
                  >
                    {(images.data ?? []).map((image) => (
                      <Select.Option key={image.image} value={image.image}>
                        <ImageNameText image={image} showSize />
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                {images.error ? (
                  <Alert
                    type="error"
                    content="系统镜像加载失败，请稍后重试。"
                  />
                ) : null}
                <Form.Item field="userData" label="cloud-init / user-data">
                  <Input.TextArea
                    autoSize={{ minRows: 5, maxRows: 10 }}
                    placeholder="#cloud-config（可选）"
                  />
                </Form.Item>
              </>
            ) : null}
            {step === 2 ? (
              <Form.Item
                field="spec"
                label="规格档位"
                rules={[{ required: true }]}
              >
                <Radio.Group type="button">
                  {Object.entries(SPECS).map(([key, spec]) => (
                    <Radio key={key} value={key}>
                      {spec.label}
                    </Radio>
                  ))}
                </Radio.Group>
              </Form.Item>
            ) : null}
            {step === 3 ? (
              <>
                <Space className={styles.row} size={16}>
                  <Form.Item field="vpcId" label="VPC" required>
                    <Select
                      loading={vpcs.isLoading}
                      placeholder="选择 VPC"
                      onChange={(vpcId) => {
                        setValue("vpcId", vpcId);
                        setValue("subnetId", "");
                        setValue("securityGroupIds", []);
                        setValue("privateIp", "");
                      }}
                    >
                      {(vpcs.data?.items ?? []).map((vpc) => (
                        <Select.Option
                          key={String(vpc.id)}
                          value={String(vpc.id)}
                        >
                          {String(vpc.name ?? vpc.id)}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item field="subnetId" label="子网" required>
                    <Select
                      disabled={!values.vpcId}
                      loading={subnets.isLoading}
                      placeholder="选择子网"
                      onChange={(subnetId) => {
                        setValue("subnetId", subnetId);
                        setValue("privateIp", "");
                      }}
                    >
                      {availableSubnets.map((subnet) => (
                        <Select.Option
                          key={String(subnet.id)}
                          value={String(subnet.id)}
                        >
                          {String(subnet.name ?? subnet.id)} ·{" "}
                          {String(subnet.cidr ?? "-")}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Space>
                <Form.Item
                  field="securityGroupIds"
                  label="安全组（可多选）"
                  required
                >
                  <Select
                    mode="multiple"
                    disabled={!values.vpcId}
                    loading={securityGroups.isLoading}
                    placeholder="至少选择一个安全组"
                    options={availableSecurityGroups.map((group) => ({
                      value: group.id,
                      label: `${group.name} · 规则 ${group.rule_count ?? group.rules.length}`,
                    }))}
                  />
                </Form.Item>
                <Space className={styles.row} size={16}>
                  <Form.Item field="ipMode" label="私网 IP">
                    <Radio.Group
                      type="button"
                      onChange={(ipMode) => {
                        setValue("ipMode", ipMode);
                        setValue(
                          "privateIp",
                          ipMode === "manual" && subnetCidr
                            ? suggestGatewayIp(subnetCidr)
                            : "",
                        );
                      }}
                    >
                      <Radio value="auto">自动分配</Radio>
                      <Radio value="manual">手动指定</Radio>
                    </Radio.Group>
                  </Form.Item>
                  {values.ipMode === "manual" ? (
                    <Form.Item
                      label="固定 IP"
                      required
                      validateStatus={privateIpError ? "error" : undefined}
                      help={privateIpError}
                    >
                      <Ipv4CidrInput
                        value={values.privateIp}
                        onChange={(value) => setValue("privateIp", value)}
                        disabledOctets={
                          subnetCidr ? subnetFixedOctets(subnetCidr) : []
                        }
                      />
                    </Form.Item>
                  ) : null}
                </Space>
                <Form.Item field="loginMode" label="登录方式">
                  <Radio.Group
                    type="button"
                    onChange={(mode) => {
                      setValue("loginMode", mode);
                      setValue("sshKeyRef", "");
                      setValue("passwordSecretRef", "");
                    }}
                  >
                    <Radio value="ssh-key">SSH 密钥</Radio>
                    <Radio value="password">密码</Radio>
                  </Radio.Group>
                </Form.Item>
                <Form.Item
                  field="sshUsername"
                  label="SSH 用户名"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="ubuntu" />
                </Form.Item>
                {values.loginMode === "ssh-key" ? (
                  <Form.Item field="sshKeyRef" label="SSH 密钥" required>
                    <Select
                      loading={secrets.isLoading}
                      placeholder="选择 SSH 密钥"
                      options={sshSecrets.map((secret) => ({
                        value: String(secret.id),
                        label: `${secret.name ?? secret.id} · ${secret.type ?? "secret"}`,
                      }))}
                    />
                  </Form.Item>
                ) : (
                  <Form.Item
                    field="passwordSecretRef"
                    label="密码凭据"
                    required
                  >
                    <Select
                      loading={secrets.isLoading}
                      placeholder="选择密码 Secret"
                      options={passwordSecrets.map((secret) => ({
                        value: String(secret.id),
                        label: `${secret.name ?? secret.id} · ${secret.type ?? "secret"}`,
                      }))}
                    />
                  </Form.Item>
                )}
              </>
            ) : null}
            {step === 4 ? (
              <>
                <Space className={styles.row} size={16}>
                  <Form.Item field="systemDisk" label="系统盘">
                    <Select
                      options={Object.entries(SYSTEM_DISKS).map(
                        ([value, disk]) => ({ value, label: disk.label }),
                      )}
                    />
                  </Form.Item>
                  <Form.Item field="dataDisk" label="数据盘">
                    <Select
                      options={[
                        { value: "none", label: "不挂载" },
                        ...Object.entries(DATA_DISKS).map(([value, disk]) => ({
                          value,
                          label: disk.label,
                        })),
                      ]}
                    />
                  </Form.Item>
                </Space>
                <Form.Item field="filesystemId" label="文件存储 NFS（可选）">
                  <Select
                    allowClear
                    loading={filesystems.isLoading}
                    placeholder="不挂载 NFS"
                    options={(
                      (filesystems.data?.items ?? []) as Filesystem[]
                    ).map((filesystem) => ({
                      value: filesystem.id,
                      label: `${filesystem.name} · ${filesystem.size_gib}Gi · ${filesystem.protocol}`,
                    }))}
                  />
                </Form.Item>
                {values.filesystemId ? (
                  <Alert
                    type="info"
                    content="文件存储将以读写方式挂载到 /mnt/nfs。"
                  />
                ) : null}
                <Space size={32}>
                  <Form.Item
                    field="autoStart"
                    label="自动启动"
                    triggerPropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    field="terminationProtection"
                    label="终止保护"
                    triggerPropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Space>
                <Descriptions
                  column={1}
                  data={[
                    { label: "名称", value: values.name },
                    { label: "台数", value: "1" },
                    {
                      label: "启动镜像",
                      value: (
                        <ImageNameText
                          image={
                            (images.data ?? []).find(
                              (image) => image.image === values.imageRef,
                            ) ?? values.imageRef
                          }
                          showSize
                        />
                      ),
                    },
                    { label: "规格", value: SPECS[values.spec].label },
                    {
                      label: "网络",
                      value: `${values.vpcId || "-"} / ${values.subnetId || "-"}`,
                    },
                    {
                      label: "安全组",
                      value: values.securityGroupIds.join("、") || "-",
                    },
                    {
                      label: "私网 IP",
                      value:
                        values.ipMode === "auto"
                          ? "自动分配"
                          : values.privateIp || "-",
                    },
                    {
                      label: "登录方式",
                      value:
                        values.loginMode === "ssh-key" ? "SSH 密钥" : "密码",
                    },
                    { label: "SSH 用户名", value: values.sshUsername || "-" },
                    {
                      label: "系统盘",
                      value: SYSTEM_DISKS[values.systemDisk].label,
                    },
                    {
                      label: "数据盘",
                      value:
                        values.dataDisk === "none"
                          ? "不挂载"
                          : DATA_DISKS[values.dataDisk].label,
                    },
                    {
                      label: "NFS",
                      value: values.filesystemId
                        ? `${values.filesystemId} → /mnt/nfs`
                        : "不挂载",
                    },
                    {
                      label: "自动启动",
                      value: values.autoStart ? "开启" : "关闭",
                    },
                    {
                      label: "终止保护",
                      value: values.terminationProtection ? "开启" : "关闭",
                    },
                  ]}
                />
              </>
            ) : null}
          </Form>
        </div>
        <div className={styles.actions}>
          <Space>
            <Button onClick={onCancel} disabled={create.isPending}>
              取消
            </Button>
            {step > 0 ? (
              <Button
                onClick={() => setStep((current) => current - 1)}
                disabled={create.isPending}
              >
                上一步
              </Button>
            ) : null}
            <Button
              type="primary"
              loading={create.isPending}
              onClick={step === STEPS.length - 1 ? () => create.mutate() : next}
            >
              {step === STEPS.length - 1 ? "提交创建" : "下一步"}
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
}
