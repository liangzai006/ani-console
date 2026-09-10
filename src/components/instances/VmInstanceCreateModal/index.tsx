import { listSecrets } from "@/api/secrets";
import type { Secret } from "@/api/secrets";
import type { NetworkSecurityGroup } from "@/api/network";
import type { StorageFilesystem } from "@/api/storage/filesystems";
import { createInstance } from "@/api/instances";
import { listNetworkSecurityGroups, listNetworkSubnets, listNetworkVpcs } from "@/api/network";
import { listRegistryImages } from "@/api/registry";
import { listFilesystems } from "@/api/storage/filesystems";
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
  Switch,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ImageNameText, Ipv4CidrInput, WizardSteps } from "@/components/common";
import { InstanceComputeSpecSelect } from "@/components/instances/InstanceComputeSpecSelect";
import {
  CPU_INSTANCE_COMPUTE_SPECS,
  type CpuInstanceComputeSpec,
} from "@/lib/instance-compute-specs";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { optionalIpv4WithinCidrError, subnetFixedOctets, suggestGatewayIp } from "@/lib/validators";
import styles from "./index.module.css";

type SecurityGroup = NetworkSecurityGroup;
type Filesystem = StorageFilesystem;
type DiskOption = "40-ssd" | "80-ssd" | "100-hdd";
type DataDiskOption = "none" | "100-ssd" | "200-ssd";
type VmConfig = {
  boot_image: string;
  user_data?: string;
  cloud_init_secret?: string;
  ssh_username: string;
  ssh_key_ref?: string;
  network: {
    vpc_id: string;
    subnet_id: string;
    security_group_ids: string[];
    assign_private_ip: boolean;
    private_ip?: string;
  };
  system_disk: {
    name: string;
    size_gib: number;
    volume_type: string;
    delete_on_failure: boolean;
    delete_with_instance: boolean;
  };
  data_disks: Array<{
    name: string;
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
type Values = {
  name: string;
  imageRef: string;
  userData: string;
  cloudInitSecret: string;
  spec: CpuInstanceComputeSpec;
  vpcId: string;
  subnetId: string;
  securityGroupIds: string[];
  ipMode: "auto" | "manual";
  privateIp: string;
  loginMode: "ssh-key" | "password";
  sshUsername: string;
  sshKeyRef: string;
  password: string;
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
  cloudInitSecret: "",
  spec: CPU_INSTANCE_COMPUTE_SPECS[2].value,
  vpcId: "",
  subnetId: "",
  securityGroupIds: [],
  ipMode: "auto",
  privateIp: "",
  loginMode: "ssh-key",
  sshUsername: "ubuntu",
  sshKeyRef: "",
  password: "",
  systemDisk: "40-ssd",
  dataDisk: "none",
  filesystemId: "",
  autoStart: true,
  terminationProtection: false,
};
const STEPS = ["基础信息", "镜像配置", "规格", "网络与 SSH", "磁盘与高级选项", "确认"];
const SYSTEM_DISKS: Record<DiskOption, { label: string; size: number; type: string }> = {
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
const buildPasswordCloudInit = (username: string, password: string) =>
  [
    "#cloud-config",
    "users:",
    `  - name: ${JSON.stringify(username)}`,
    "    sudo: ALL=(ALL) NOPASSWD:ALL",
    "    groups: sudo",
    "    shell: /bin/bash",
    `    plain_text_passwd: ${JSON.stringify(password)}`,
    "    lock_passwd: false",
    "ssh_pwauth: true",
    "",
  ].join("\n");

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

  useEffect(() => {
    if (!visible) return;
    form.setFieldsValue(INITIAL);
    setValues(INITIAL);
    setStep(0);
  }, [form, visible]);

  const images = useQuery({
    queryKey: ["registry-images", "vm-create", "system"],
    enabled: visible,
    queryFn: async () => (await listRegistryImages({ limit: 100, purpose: "system" })).items,
  });
  const vpcs = useQuery({
    queryKey: ["network-vpcs", "vm-create"],
    enabled: visible,
    queryFn: () => listNetworkVpcs({ limit: 100 }),
  });
  const subnets = useQuery({
    queryKey: ["network-subnets", "vm-create", values.vpcId],
    enabled: visible && !!values.vpcId,
    queryFn: () => listNetworkSubnets({ limit: 100, vpc_id: values.vpcId }),
  });
  const securityGroups = useQuery({
    queryKey: ["network-security-groups", "vm-create", values.vpcId],
    enabled: visible && !!values.vpcId,
    queryFn: () => listNetworkSecurityGroups({ limit: 100, vpc_id: values.vpcId }),
  });
  const filesystems = useQuery({
    queryKey: ["filesystems", "vm-create"],
    enabled: visible,
    queryFn: () => listFilesystems({ limit: 100 }),
  });
  const secrets = useQuery({
    queryKey: ["secrets", "vm-create"],
    enabled: visible,
    queryFn: () => listSecrets({ limit: 100 }),
  });
  const availableSubnets = (subnets.data?.items ?? []).filter(
    (item) => item.vpc_id === values.vpcId,
  );
  const availableSecurityGroups = ((securityGroups.data?.items ?? []) as SecurityGroup[]).filter(
    (item) => !item.vpc_id || item.vpc_id === values.vpcId,
  );
  const selectedSubnet = availableSubnets.find((item) => String(item.id) === values.subnetId);
  const subnetCidr = selectedSubnet?.cidr ? String(selectedSubnet.cidr) : "";
  const privateIpError =
    values.ipMode === "manual" && values.privateIp && subnetCidr
      ? optionalIpv4WithinCidrError(values.privateIp, subnetCidr, "固定 IP", "子网 CIDR")
      : undefined;
  const activeSecrets = ((secrets.data?.items ?? []) as Secret[]).filter(
    (secret) => secret.state !== "deleted" && secret.id,
  );
  const sshSecrets = activeSecrets.filter((secret) => /ssh|key/i.test(secret.type ?? ""));
  const userDataSecrets = activeSecrets.filter(
    (secret) => secret.name && secret.keys?.some((key) => key.trim().toLowerCase() === "userdata"),
  );

  const create = useMutation({
    mutationFn: async () => {
      const instanceName = values.name.trim();
      const spec =
        CPU_INSTANCE_COMPUTE_SPECS.find((option) => option.value === values.spec) ??
        CPU_INSTANCE_COMPUTE_SPECS[2];
      const systemDisk = SYSTEM_DISKS[values.systemDisk];
      const dataDisk = values.dataDisk === "none" ? undefined : DATA_DISKS[values.dataDisk];
      const userData =
        values.loginMode === "password"
          ? buildPasswordCloudInit(values.sshUsername.trim(), values.password)
          : optional(values.userData);
      const vmConfig: VmConfig = {
        boot_image: values.imageRef,
        user_data: userData,
        cloud_init_secret: optional(values.cloudInitSecret),
        ssh_username: values.sshUsername.trim(),
        ssh_key_ref: values.loginMode === "ssh-key" ? values.sshKeyRef : undefined,
        network: {
          vpc_id: values.vpcId,
          subnet_id: values.subnetId,
          security_group_ids: values.securityGroupIds,
          assign_private_ip: values.ipMode === "auto",
          private_ip: values.ipMode === "manual" ? optional(values.privateIp) : undefined,
        },
        system_disk: {
          name: `${instanceName}-root`,
          size_gib: systemDisk.size,
          volume_type: systemDisk.type,
          delete_on_failure: true,
          delete_with_instance: true,
        },
        data_disks: dataDisk
          ? [
              {
                name: `${instanceName}-data-1`,
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
        name: instanceName,
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
      return (await createInstance(submitData)).operation_id;
    },
    onSuccess: async (operationId) => {
      Message.success("云主机创建已提交");
      await queryClient.invalidateQueries({ queryKey: ["vm-instances"] });
      onCreated(operationId);
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "create")),
  });

  const close = () => {
    onCancel();
  };
  const next = async () => {
    try {
      await form.validate();
      if (step === 1 && !values.imageRef) throw new Error();
      if (step === 3 && (!values.vpcId || !values.subnetId)) throw new Error();
      if (step === 3 && values.ipMode === "manual" && (!values.privateIp || privateIpError))
        throw new Error();
      if (step === 3 && values.loginMode === "ssh-key" && !values.sshKeyRef) throw new Error();
      if (step === 3 && values.loginMode === "password" && !values.password) throw new Error();
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
      onCancel={close}
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
            onClick={step === STEPS.length - 1 ? () => create.mutate() : next}
          >
            {step === STEPS.length - 1 ? "提交创建" : "下一步"}
          </Button>
        </Space>
      }
      unmountOnExit
      maskClosable={!create.isPending}
      style={{ width: 820 }}
    >
      <div className={styles.form}>
        <WizardSteps current={step + 1} items={STEPS} />
        <div className={styles.content}>
          <Form
            form={form}
            layout="vertical"
            initialValues={INITIAL}
            onValuesChange={(changed) => setValues((current) => ({ ...current, ...changed }))}
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
                <Form.Item field="imageRef" label="启动镜像（系统镜像）" required>
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
                  <Alert type="error" content="系统镜像加载失败，请稍后重试。" />
                ) : null}
                <Form.Item field="userData" label="cloud-init / user-data">
                  <Input.TextArea
                    disabled={values.loginMode === "password"}
                    autoSize={{ minRows: 5, maxRows: 10 }}
                    placeholder={
                      values.loginMode === "password"
                        ? "密码登录时根据用户名和密码自动生成"
                        : "#cloud-config（可选）"
                    }
                  />
                </Form.Item>
                <Form.Item field="cloudInitSecret" label="cloud-init Secret（可选）">
                  <Select
                    allowClear
                    loading={secrets.isLoading}
                    placeholder="选择包含 userdata 键的 Secret"
                    options={userDataSecrets.map((secret) => ({
                      value: String(secret.name),
                      label: `${secret.name} · ${secret.type ?? "secret"}`,
                    }))}
                    onChange={(cloudInitSecret) => {
                      setValue("cloudInitSecret", cloudInitSecret ?? "");
                    }}
                  />
                </Form.Item>
                <Alert
                  type="info"
                  content="仅显示包含 userdata 键的 Secret；可与内联 user-data 共存。密码登录时，前端会根据用户名和密码生成内联 user-data。"
                />
              </>
            ) : null}
            {step === 2 ? (
              <InstanceComputeSpecSelect
                field="spec"
                profile="cpu"
                label="规格档位"
                placeholder="请选择规格档位"
              />
            ) : null}
            {step === 3 ? (
              <>
                <Form.Item field="vpcId" label="VPC" required>
                  <Select
                    allowClear
                    loading={vpcs.isLoading}
                    placeholder="选择 VPC"
                    onChange={(vpcId) => {
                      setValue("vpcId", vpcId ?? "");
                      setValue("subnetId", "");
                      setValue("securityGroupIds", []);
                      setValue("privateIp", "");
                    }}
                  >
                    {(vpcs.data?.items ?? []).map((vpc) => (
                      <Select.Option key={String(vpc.id)} value={String(vpc.id)}>
                        {String(vpc.name ?? vpc.id)}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item field="subnetId" label="子网" required>
                  <Select
                    allowClear
                    disabled={!values.vpcId}
                    loading={subnets.isLoading}
                    placeholder="选择子网"
                    onChange={(subnetId) => {
                      setValue("subnetId", subnetId ?? "");
                      setValue("privateIp", "");
                    }}
                  >
                    {availableSubnets.map((subnet) => (
                      <Select.Option key={String(subnet.id)} value={String(subnet.id)}>
                        {String(subnet.name ?? subnet.id)} · {String(subnet.cidr ?? "-")}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item field="securityGroupIds" label="安全组（可选，可多选）">
                  <Select
                    mode="multiple"
                    disabled={!values.vpcId}
                    loading={securityGroups.isLoading}
                    placeholder="可不选择安全组"
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
                          ipMode === "manual" && subnetCidr ? suggestGatewayIp(subnetCidr) : "",
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
                        disabledOctets={subnetCidr ? subnetFixedOctets(subnetCidr) : []}
                      />
                    </Form.Item>
                  ) : null}
                </Space>
                <Form.Item field="loginMode" label="登录方式">
                  <Radio.Group
                    type="button"
                    onChange={(mode) => {
                      if (mode === "password" && values.userData.trim()) {
                        setValue("userData", "");
                        Message.info("密码登录会自动生成内联 user-data，已清除自定义内容");
                      }
                      setValue("loginMode", mode);
                      setValue("sshKeyRef", "");
                      setValue("password", "");
                    }}
                  >
                    <Radio value="ssh-key">SSH 密钥</Radio>
                    <Radio value="password">密码</Radio>
                  </Radio.Group>
                </Form.Item>
                <Form.Item field="sshUsername" label="用户名" rules={[{ required: true }]}>
                  <Input placeholder="请输入 VM 登录用户名" />
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
                  <>
                    <Form.Item field="password" label="密码" required>
                      <Input.Password
                        placeholder="请输入 VM 登录密码"
                        maxLength={256}
                        autoComplete="new-password"
                      />
                    </Form.Item>
                  </>
                )}
              </>
            ) : null}
            {step === 4 ? (
              <>
                <Form.Item field="systemDisk" label="系统盘">
                  <Select
                    options={Object.entries(SYSTEM_DISKS).map(([value, disk]) => ({
                      value,
                      label: disk.label,
                    }))}
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
                <Form.Item field="filesystemId" label="文件存储 NFS（可选）">
                  <Select
                    allowClear
                    loading={filesystems.isLoading}
                    placeholder="不挂载 NFS"
                    options={((filesystems.data?.items ?? []) as Filesystem[]).map(
                      (filesystem) => ({
                        value: filesystem.id,
                        label: `${filesystem.name} · ${filesystem.size_gib}Gi · ${filesystem.protocol}`,
                      }),
                    )}
                  />
                </Form.Item>
                {values.filesystemId ? (
                  <Alert type="info" content="文件存储将以读写方式挂载到 /mnt/nfs。" />
                ) : null}
                <Space size={32}>
                  <Form.Item field="autoStart" label="自动启动" triggerPropName="checked">
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
              </>
            ) : null}
            {step === 5 ? (
              <Descriptions
                column={1}
                border
                data={[
                  { label: "名称", value: values.name },
                  { label: "台数", value: "1" },
                  {
                    label: "启动镜像",
                    value: (
                      <ImageNameText
                        image={
                          (images.data ?? []).find((image) => image.image === values.imageRef) ??
                          values.imageRef
                        }
                        showSize
                      />
                    ),
                  },
                  { label: "规格", value: values.spec },
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
                    value: values.ipMode === "auto" ? "自动分配" : values.privateIp || "-",
                  },
                  {
                    label: "登录方式",
                    value: values.loginMode === "ssh-key" ? "SSH 密钥" : "密码",
                  },
                  { label: "用户名", value: values.sshUsername || "-" },
                  {
                    label: "cloud-init",
                    value:
                      [
                        values.loginMode === "password"
                          ? "内联用户名/密码 user-data"
                          : values.userData.trim()
                            ? "内联 user-data"
                            : "",
                        values.cloudInitSecret ? `Secret ${values.cloudInitSecret}` : "",
                      ]
                        .filter(Boolean)
                        .join(" + ") || "未配置",
                  },
                  {
                    label: "登录凭据",
                    value:
                      values.loginMode === "ssh-key"
                        ? values.sshKeyRef || "-"
                        : values.password
                          ? "已输入（不展示）"
                          : "-",
                  },
                  {
                    label: "系统盘",
                    value: SYSTEM_DISKS[values.systemDisk].label,
                  },
                  {
                    label: "数据盘",
                    value:
                      values.dataDisk === "none" ? "不挂载" : DATA_DISKS[values.dataDisk].label,
                  },
                  {
                    label: "NFS",
                    value: values.filesystemId ? `${values.filesystemId} → /mnt/nfs` : "不挂载",
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
            ) : null}
          </Form>
        </div>
      </div>
    </Modal>
  );
}
