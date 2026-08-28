import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Typography,
} from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { coreApi } from "@/api/client";
import { newIdempotencyKey } from "@/lib/idempotency";
import { PageHeader } from "@/components/shell/AppShell";
import {
  DataTable,
  ApiErrorAlert,
  ListDataTable,
  ListPageFrame,
  ListPageHeader,
  ListNameCell,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
  StatusTag,
  AsyncTaskPoller,
  Ipv4CidrInput,
} from "@/components/common";
import { formatDateTime } from "@/lib/format";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { listOrThrow } from "@/lib/api-list";
import {
  optionalIpv4WithinCidrError,
  subnetFixedOctets,
  suggestGatewayIp,
} from "@/lib/validators";
import {
  getInstanceDisplayIp,
  getInstanceNetworkValue,
} from "@/lib/instance-network";
import {
  getInstanceActionErrorMessage,
  parseSandboxCommand,
} from "@/lib/sandbox-instance";
import type { components } from "@/api/core-schema";

export const Route = createFileRoute("/_authenticated/instances/")({
  component: () => <InstancesListPage />,
});

type Instance = components["schemas"]["InstanceRecord"];
type CreateInstanceRequest = components["schemas"]["CreateInstanceRequest"];
type InstanceKind = CreateInstanceRequest["kind"];
type NetworkMode = "default" | "vpc";
type IpAllocationMode = "auto" | "manual";
type VmBootMode = "containerDisk" | "iso";
type InstanceStatusFilter =
  "all" | "running" | "stopped" | "deploying" | "failed";
type InstanceSearchField = "name" | "id";

const VM_BOOT_IMAGE = "quay.io/kubevirt/cirros-container-disk-demo:v1.2.0";
const CONTAINER_IMAGE = "dockerproxy.net/library/nginx:1.27-alpine";
const SANDBOX_IMAGE = "docker.changqingyun.cn/mirror/busybox:latest";
const INSTANCE_LIST_POLL_MS = 5000;

type InstanceFormState = {
  name: string;
  kind: InstanceKind;
  image: string;
  command: string;
  cpu: string;
  memory: string;
  auto_start: boolean;
  boot_mode: VmBootMode;
  boot_image: string;
  boot_media_image_id: string;
  root_disk_size_gib: number;
  ssh_username: string;
  ssh_key_ref: string;
  termination_protection: boolean;
  gpu_vendor: string;
  gpu_model: string;
  gpu_count: number;
  replicas: number;
  network_mode: NetworkMode;
  ip_allocation: IpAllocationMode;
  vpc_id: string;
  subnet_id: string;
  private_ip: string;
  sandbox_runtime_class: string;
  sandbox_session_timeout: string;
  sandbox_network_egress_policy: components["schemas"]["SandboxNetworkEgressPolicy"];
};

const kindDefaults: Record<InstanceKind, Partial<InstanceFormState>> = {
  vm: {
    image: "",
    boot_mode: "containerDisk",
    boot_image: VM_BOOT_IMAGE,
    boot_media_image_id: "",
    root_disk_size_gib: 40,
    ssh_username: "cirros",
    cpu: "2",
    memory: "4Gi",
    replicas: 1,
  },
  container: {
    image: CONTAINER_IMAGE,
    boot_image: "",
    cpu: "2",
    memory: "4Gi",
    replicas: 1,
  },
  gpu_container: {
    image: CONTAINER_IMAGE,
    boot_image: "",
    cpu: "4",
    memory: "8Gi",
    gpu_vendor: "nvidia",
    gpu_model: "A100",
    gpu_count: 1,
    replicas: 1,
  },
  sandbox: {
    image: SANDBOX_IMAGE,
    command: 'sh -c "uname -a; sleep 300"',
    boot_image: "",
    sandbox_runtime_class: "sandbox-kata",
    sandbox_session_timeout: "30m",
    sandbox_network_egress_policy: "deny_all",
  },
};

const kindOptionMeta: Array<{
  kind: InstanceKind;
  label: string;
  desc: string;
}> = [
  {
    kind: "container",
    label: "容器",
    desc: "标准容器实例，适合 Web/API 服务。",
  },
  {
    kind: "vm",
    label: "VM",
    desc: "KubeVirt 虚拟机实例，支持 SSH/系统级运行环境。",
  },
  {
    kind: "gpu_container",
    label: "GPU 容器",
    desc: "带 GPU 资源请求的容器实例。",
  },
  {
    kind: "sandbox",
    label: "Sandbox",
    desc: "隔离运行环境，带会话时长与出口策略。",
  },
];

const defaultInstanceForm: InstanceFormState = {
  name: "",
  kind: "container",
  image: CONTAINER_IMAGE,
  command: "",
  cpu: "2",
  memory: "4Gi",
  auto_start: true,
  boot_mode: "containerDisk",
  boot_image: "",
  boot_media_image_id: "",
  root_disk_size_gib: 40,
  ssh_username: "cirros",
  ssh_key_ref: "",
  termination_protection: false,
  gpu_vendor: "",
  gpu_model: "",
  gpu_count: 1,
  replicas: 1,
  network_mode: "default",
  ip_allocation: "auto",
  vpc_id: "",
  subnet_id: "",
  private_ip: "",
  sandbox_runtime_class: "sandbox-kata",
  sandbox_session_timeout: "30m",
  sandbox_network_egress_policy: "deny_all",
};

type InstancesListPageProps = {
  kindFilter?: InstanceKind;
  lockKind?: boolean;
  title?: string;
  subtitle?: string;
};

function createDefaultForm(kindFilter?: InstanceKind): InstanceFormState {
  if (!kindFilter) return { ...defaultInstanceForm };
  return {
    ...defaultInstanceForm,
    kind: kindFilter,
    ...kindDefaults[kindFilter],
  };
}

function optionalTrimmed(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function buildCreateInstanceBody(
  form: InstanceFormState,
  idempotencyKey = newIdempotencyKey(),
): CreateInstanceRequest {
  const body: CreateInstanceRequest = {
    idempotency_key: idempotencyKey,
    name: form.name.trim(),
    kind: form.kind,
    instance_type: form.kind,
    cpu: optionalTrimmed(form.cpu),
    memory: optionalTrimmed(form.memory),
    auto_start: form.auto_start,
    ssh_username:
      form.kind === "vm" ? (optionalTrimmed(form.ssh_username) ?? null) : null,
    termination_protection: form.termination_protection,
    replicas: form.replicas,
  };

  if (
    form.kind === "container" ||
    form.kind === "gpu_container" ||
    form.kind === "sandbox"
  ) {
    body.image = optionalTrimmed(form.image) ?? null;
  }

  if (form.kind === "vm") {
    if (form.boot_mode === "iso") {
      body.boot_image = null;
      body.boot_media = {
        type: "iso",
        image_id: form.boot_media_image_id,
        boot_order: 1,
      };
      body.root_disk_size_gib = form.root_disk_size_gib;
    } else {
      body.boot_image = optionalTrimmed(form.boot_image) ?? null;
      body.boot_media = null;
      body.root_disk_size_gib = null;
    }
    body.ssh_key_ref = optionalTrimmed(form.ssh_key_ref) ?? null;
  }

  if (form.kind === "gpu_container") {
    body.gpu = {
      vendor: optionalTrimmed(form.gpu_vendor),
      model: optionalTrimmed(form.gpu_model),
      count: form.gpu_count,
    };
  }

  if (form.kind === "sandbox") {
    body.command = parseSandboxCommand(form.command) ?? null;
    body.sandbox_config = {
      runtime_class: form.sandbox_runtime_class,
      session_timeout: form.sandbox_session_timeout,
      network_egress_policy: form.sandbox_network_egress_policy,
    };
  }

  if (form.network_mode === "vpc" && form.subnet_id) {
    body.network = {
      vpc_id: optionalTrimmed(form.vpc_id),
      subnet_id: form.subnet_id,
    };
    if (form.ip_allocation === "manual")
      body.network.private_ip = optionalTrimmed(form.private_ip);
  }

  return body;
}

export const buildCreateInstanceBodyForTest = buildCreateInstanceBody;

function createRouteForKind(kindFilter?: InstanceKind): string | null {
  if (kindFilter === "container") return "/instances/container/create";
  if (kindFilter === "vm") return "/instances/vm/create";
  if (kindFilter === "sandbox") return "/instances/sandbox/create";
  return null;
}

export function InstancesListPage(props: InstancesListPageProps = {}) {
  const {
    kindFilter,
    lockKind = false,
    title = "实例",
    subtitle = "VM / 容器 / GPU 容器 / Sandbox",
  } = props;
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<InstanceStatusFilter>("all");
  const [searchField, setSearchField] = useState<InstanceSearchField>("name");
  const [searchText, setSearchText] = useState("");

  const {
    query: instances,
    page,
    pageSize,
    setPage,
    setPageSize,
    refresh,
  } = useCursorPaginatedQuery<Instance>({
    queryKey: ["instances", kindFilter ?? "all"],
    cursorScope: `${kindFilter ?? "all"}:${statusFilter}:${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      // Core accepts kind=sandbox for the real Sandbox list flow; generated query enum is still narrower.
      const listQuery = { limit, cursor, kind: kindFilter } as never;
      const { data, error } = await coreApi.GET("/instances", {
        params: { query: listQuery },
      });
      if (error || !data) throw error ?? new Error("实例列表未返回结果");
      return data;
    },
    refetchInterval: INSTANCE_LIST_POLL_MS,
  });
  const { data, isLoading, isFetching, error } = instances;
  useListErrorNotification({
    id: `instances-list:${kindFilter ?? "all"}`,
    title: `${title}列表加载失败`,
    error,
  });

  const items = ((data?.items ?? []) as Instance[]).filter(
    (item) => item.state !== "deleted",
  );
  const prototypeTable =
    kindFilter === "gpu_container" || kindFilter === "sandbox";
  const normalizedSearch = searchText.trim().toLowerCase();
  const matchesStatus = (item: Instance) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "deploying") {
      return (
        item.state === "pending" ||
        item.state === "provisioning" ||
        item.state === "starting"
      );
    }
    if (statusFilter === "failed") return item.state === "failed";
    return item.state === statusFilter;
  };
  const filteredItems = items.filter((item) => {
    if (!matchesStatus(item)) return false;
    if (!normalizedSearch) return true;
    const value = searchField === "id" ? item.id : (item.name ?? "");
    return value.toLowerCase().includes(normalizedSearch);
  });
  const statusTabs = [
    { value: "all" as const, label: "全部", count: items.length },
    {
      value: "running" as const,
      label: "运行中",
      count: items.filter((item) => item.state === "running").length,
    },
    {
      value: "stopped" as const,
      label: "已停止",
      count: items.filter((item) => item.state === "stopped").length,
    },
    {
      value: "deploying" as const,
      label: "部署中",
      count: items.filter(
        (item) =>
          item.state === "pending" ||
          item.state === "provisioning" ||
          item.state === "starting",
      ).length,
    },
    {
      value: "failed" as const,
      label: "异常",
      count: items.filter((item) => item.state === "failed").length,
    },
  ];
  const prototypeColumns: Array<ListColumn<Instance>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, row) => (
        <ListNameCell
          name={
            <Link
              to={
                kindFilter === "sandbox"
                  ? "/instances/sandbox/$instanceId"
                  : "/instances/$instanceId"
              }
              params={{ instanceId: row.id }}
            >
              {row.name ?? row.id}
            </Link>
          }
          id={row.id}
        />
      ),
    },
    { key: "kind", title: "类型", render: (_, row) => row.kind },
    {
      key: "vpc",
      title: "VPC",
      render: (_, row) => getInstanceNetworkValue(row, "vpc_id"),
    },
    {
      key: "subnet",
      title: "子网",
      render: (_, row) => getInstanceNetworkValue(row, "subnet_id"),
    },
    {
      key: "ip",
      title: "IP",
      render: (_, row) => getInstanceDisplayIp(row),
    },
    {
      key: "state",
      title: "状态",
      width: 120,
      render: (_, row) => <StatusTag status={row.state} />,
    },
    {
      key: "createdAt",
      title: "创建时间",
      render: (_, row) => formatDateTime(row.created_at),
    },
  ];
  const paginationTotal = data?.total ?? filteredItems.length;
  const createRoute = createRouteForKind(kindFilter);
  const openCreate = () => {
    if (createRoute) {
      navigate({ to: createRoute });
      return;
    }
    setVisible(true);
  };
  const prototypeDataTable = (
    <ListDataTable
      data={filteredItems}
      columns={prototypeColumns}
      rowSelection={{
        selectedRowKeys: selectedKeys,
        onChange: (keys) => setSelectedKeys(keys.map(String)),
      }}
      loading={isLoading}
      emptyIconClassName={
        kindFilter === "sandbox" ? "icon-Sandbox" : "icon-GPU"
      }
      emptyText="暂无实例，点击右上角创建"
      tableLabel={`${title}列表`}
      preserveTableOnEmpty={kindFilter === "sandbox"}
      pagination={{
        page,
        pageSize,
        total: paginationTotal,
        onPageChange: setPage,
        onPageSizeChange: (nextPageSize) => {
          setPageSize(nextPageSize);
          setSelectedKeys([]);
        },
      }}
    />
  );

  useEffect(() => {
    setPage(1);
    setSelectedKeys([]);
  }, [searchField, searchText, statusFilter]);

  if (prototypeTable) {
    return (
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName={
              kindFilter === "sandbox" ? "icon-Sandbox" : "icon-GPUrongqishili"
            }
            title={title}
            subtitle={subtitle}
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={openCreate}
              >
                创建{title}
              </ToolbarButton>
            }
          />
        }
        tabs={
          <StatusTabs
            items={statusTabs}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        }
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSearch
                fields={[
                  { value: "name", label: "名称" },
                  { value: "id", label: "ID" },
                ]}
                field={searchField}
                value={searchText}
                onFieldChange={setSearchField}
                onChange={setSearchText}
              />
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={isFetching}
                onClick={refresh}
              />
            }
          />
        }
      >
        {taskId ? (
          <AsyncTaskPoller taskId={taskId} onComplete={() => setTaskId(null)} />
        ) : null}
        {prototypeDataTable}
      </ListPageFrame>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        subtitle={subtitle}
        extra={
          <Button type="primary" onClick={openCreate}>
            创建实例
          </Button>
        }
      />
      {taskId ? (
        <AsyncTaskPoller taskId={taskId} onComplete={() => setTaskId(null)} />
      ) : null}
      <DataTable<Instance>
        columns={[
          {
            title: "名称",
            render: (_, r) => (
              <Link
                to={
                  kindFilter === "container"
                    ? "/instances/container/$instanceId"
                    : kindFilter === "vm"
                      ? "/instances/vm/$instanceId"
                      : kindFilter === "sandbox"
                        ? "/instances/sandbox/$instanceId"
                        : "/instances/$instanceId"
                }
                params={{ instanceId: r.id }}
                className="text-inherit"
              >
                {r.name ?? r.id}
              </Link>
            ),
          },
          { title: "类型", dataIndex: "kind" },
          {
            title: "VPC",
            render: (_, r) => getInstanceNetworkValue(r, "vpc_id"),
          },
          {
            title: "子网",
            render: (_, r) => getInstanceNetworkValue(r, "subnet_id"),
          },
          { title: "IP", render: (_, r) => getInstanceDisplayIp(r) },
          {
            title: "状态",
            width: 120,
            render: (_, r) => <StatusTag status={r.state} />,
          },
          { title: "创建时间", render: (_, r) => formatDateTime(r.created_at) },
        ]}
        data={error ? [] : items}
        loading={isLoading}
        pagination={false}
        noDataElement={
          error ? (
            <ApiErrorAlert error={error} />
          ) : (
            <Empty description="暂无实例，点击右上角创建" />
          )
        }
      />
      <Modal
        visible={visible}
        title={
          kindFilter
            ? `创建${kindOptionMeta.find((k) => k.kind === kindFilter)?.label ?? "实例"}`
            : "创建实例"
        }
        onCancel={() => setVisible(false)}
        footer={null}
      >
        <InstanceCreateForm
          kindFilter={kindFilter}
          lockKind={lockKind}
          onCancel={() => setVisible(false)}
          onCreated={({ taskId: createdTaskId }) => {
            setVisible(false);
            if (createdTaskId) setTaskId(createdTaskId);
          }}
        />
      </Modal>
    </div>
  );
}

export function InstanceCreateForm({
  kindFilter,
  lockKind = false,
  initialValues,
  onCancel,
  onCreated,
}: {
  kindFilter?: InstanceKind;
  lockKind?: boolean;
  initialValues?: Partial<InstanceFormState>;
  onCancel: () => void;
  onCreated: (result: { taskId?: string; instanceId?: string }) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<InstanceFormState>(() => ({
    ...createDefaultForm(kindFilter),
    ...initialValues,
  }));
  const [createIdempotencyKey, setCreateIdempotencyKey] = useState(() =>
    newIdempotencyKey(),
  );
  const vpcs = useQuery({
    queryKey: ["network-vpcs", "select"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/vpcs", { params: { query: { limit: 50 } } }),
      ),
  });
  const subnets = useQuery({
    queryKey: ["network-subnets", "select"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/subnets", { params: { query: { limit: 50 } } }),
      ),
  });
  const images = useQuery({
    queryKey: ["images", "vm-iso-select"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/images", {
          params: { query: { format: "iso", state: "ready", limit: 100 } },
        }),
      ),
    enabled: form.kind === "vm",
  });
  const selectedSubnets = (subnets.data?.items ?? []).filter(
    (subnet) => !form.vpc_id || subnet.vpc_id === form.vpc_id,
  );
  const selectedSubnet = selectedSubnets.find(
    (subnet) => String(subnet.id) === form.subnet_id,
  );
  const selectedSubnetCidr = selectedSubnet?.cidr
    ? String(selectedSubnet.cidr)
    : "";
  const manualIpFixedOctets = selectedSubnetCidr
    ? subnetFixedOctets(selectedSubnetCidr)
    : [];
  const privateIpError =
    form.network_mode === "vpc" &&
    form.ip_allocation === "manual" &&
    form.private_ip &&
    selectedSubnetCidr
      ? optionalIpv4WithinCidrError(
          form.private_ip,
          selectedSubnetCidr,
          "固定 IP",
          "子网 CIDR",
        )
      : undefined;

  const setNetworkMode = (mode: NetworkMode) => {
    setForm((current) => ({
      ...current,
      network_mode: mode,
      ip_allocation: mode === "default" ? "auto" : current.ip_allocation,
      vpc_id: mode === "default" ? "" : current.vpc_id,
      subnet_id: mode === "default" ? "" : current.subnet_id,
      private_ip:
        mode === "default" || current.ip_allocation === "auto"
          ? ""
          : current.private_ip,
    }));
  };

  const setIpAllocation = (mode: IpAllocationMode) => {
    setForm((current) => ({
      ...current,
      ip_allocation: mode,
      private_ip:
        mode === "manual" && selectedSubnetCidr
          ? current.private_ip || suggestGatewayIp(selectedSubnetCidr)
          : "",
    }));
  };

  const create = useMutation({
    mutationFn: async () => {
      if (form.kind === "sandbox" && !optionalTrimmed(form.image))
        throw new Error("请输入镜像");
      if (form.network_mode === "vpc" && !form.subnet_id)
        throw new Error("请选择子网");
      if (
        form.network_mode === "vpc" &&
        form.ip_allocation === "manual" &&
        !form.private_ip
      )
        throw new Error("请输入固定 IP");
      if (privateIpError) throw new Error(privateIpError);
      if (
        form.kind === "vm" &&
        form.boot_mode === "containerDisk" &&
        !optionalTrimmed(form.boot_image)
      ) {
        throw new Error("请输入 Boot Image");
      }
      if (
        form.kind === "vm" &&
        form.boot_mode === "iso" &&
        !form.boot_media_image_id
      ) {
        throw new Error("请选择 ISO 镜像");
      }
      if (
        form.kind === "vm" &&
        form.boot_mode === "iso" &&
        form.root_disk_size_gib < 1
      ) {
        throw new Error("系统盘大小必须大于 0");
      }
      const { data, error, response } = await coreApi.POST("/instances", {
        body: buildCreateInstanceBody(form, createIdempotencyKey),
      });
      if (error)
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error) }),
          status: response.status,
        };
      const loc = response.headers.get("Location");
      return {
        taskId: loc?.match(/tasks\/([^/]+)/)?.[1] ?? data?.operation_id,
        instanceId: data?.instance?.id,
      };
    },
    onSuccess: (result) => {
      Message.success("实例创建已提交");
      setForm(createDefaultForm(kindFilter));
      setCreateIdempotencyKey(newIdempotencyKey());
      qc.invalidateQueries({ queryKey: ["instances"] });
      onCreated(result);
    },
    onError: (e) => Message.error(getInstanceActionErrorMessage(e, "create")),
  });

  const handleCancel = () => {
    setCreateIdempotencyKey(newIdempotencyKey());
    onCancel();
  };

  return (
    <Form layout="vertical">
      <Form.Item label="名称" required>
        <Input
          data-testid="instance-name-input"
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        />
      </Form.Item>
      {!lockKind ? (
        <Form.Item label="类型">
          <Space wrap size={8}>
            {kindOptionMeta.map((option) => (
              <Button
                key={option.kind}
                type={form.kind === option.kind ? "primary" : "outline"}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    kind: option.kind,
                    ...kindDefaults[option.kind],
                  }))
                }
              >
                {option.label}
              </Button>
            ))}
          </Space>
          <Typography.Paragraph type="secondary" className="!mt-2 !mb-0">
            {kindOptionMeta.find((item) => item.kind === form.kind)?.desc}
          </Typography.Paragraph>
        </Form.Item>
      ) : (
        <Form.Item label="类型">
          <Typography.Text>
            {kindOptionMeta.find((item) => item.kind === form.kind)?.label}
          </Typography.Text>
        </Form.Item>
      )}
      <Form.Item label="网络">
        <Radio.Group
          type="button"
          value={form.network_mode}
          onChange={setNetworkMode}
        >
          <Radio value="default">默认网络</Radio>
          <Radio value="vpc">VPC 网络</Radio>
        </Radio.Group>
      </Form.Item>
      {form.network_mode === "vpc" ? (
        <>
          <Form.Item label="VPC" required>
            <Select
              data-testid="instance-vpc-select"
              value={form.vpc_id}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  vpc_id: v,
                  subnet_id: "",
                  private_ip: "",
                }))
              }
              loading={vpcs.isLoading}
              allowClear
              placeholder="选择 VPC"
            >
              {(vpcs.data?.items ?? []).map((vpc) => (
                <Select.Option key={String(vpc.id)} value={String(vpc.id)}>
                  {String(vpc.name ?? vpc.id)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="子网" required>
            <Select
              data-testid="instance-subnet-select"
              value={form.subnet_id}
              onChange={(v) => {
                const subnet = selectedSubnets.find(
                  (item) => String(item.id) === v,
                );
                const subnetCidr = subnet?.cidr ? String(subnet.cidr) : "";
                setForm((f) => ({
                  ...f,
                  subnet_id: v,
                  private_ip:
                    f.ip_allocation === "manual" && subnetCidr
                      ? suggestGatewayIp(subnetCidr)
                      : "",
                }));
              }}
              loading={subnets.isLoading}
              disabled={!form.vpc_id}
              allowClear
              placeholder={form.vpc_id ? "选择子网" : "先选择 VPC"}
            >
              {selectedSubnets.map((subnet) => (
                <Select.Option
                  key={String(subnet.id)}
                  value={String(subnet.id)}
                >
                  {String(subnet.name ?? subnet.id)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="IP 分配">
            <Radio.Group
              type="button"
              value={form.ip_allocation}
              onChange={setIpAllocation}
            >
              <Radio value="auto">自动分配</Radio>
              <Radio value="manual">手动指定</Radio>
            </Radio.Group>
          </Form.Item>
          {form.ip_allocation === "manual" ? (
            <Form.Item
              label="固定 IP"
              validateStatus={privateIpError ? "error" : undefined}
              help={privateIpError}
            >
              <div data-testid="instance-private-ip-input">
                <Ipv4CidrInput
                  value={form.private_ip}
                  onChange={(v) => setForm((f) => ({ ...f, private_ip: v }))}
                  placeholder={
                    selectedSubnetCidr
                      ? suggestGatewayIp(selectedSubnetCidr)
                      : "10.0.1.10"
                  }
                  disabledOctets={manualIpFixedOctets}
                />
              </div>
            </Form.Item>
          ) : null}
        </>
      ) : null}
      <Form.Item label="CPU">
        <Input
          value={form.cpu}
          onChange={(v) => setForm((f) => ({ ...f, cpu: v }))}
          placeholder="2"
        />
      </Form.Item>
      <Form.Item label="内存">
        <Input
          value={form.memory}
          onChange={(v) => setForm((f) => ({ ...f, memory: v }))}
          placeholder="4Gi"
        />
      </Form.Item>
      {form.kind === "container" ||
      form.kind === "gpu_container" ||
      form.kind === "sandbox" ? (
        <>
          <Form.Item label="镜像" required>
            <Input
              data-testid="instance-image-input"
              value={form.image}
              onChange={(v) => setForm((f) => ({ ...f, image: v }))}
              placeholder={
                form.kind === "sandbox" ? SANDBOX_IMAGE : CONTAINER_IMAGE
              }
            />
          </Form.Item>
          {form.kind !== "sandbox" ? (
            <Form.Item label="副本数">
              <InputNumber
                value={form.replicas}
                min={1}
                precision={0}
                onChange={(v) =>
                  setForm((f) => ({ ...f, replicas: Number(v ?? 1) }))
                }
              />
            </Form.Item>
          ) : null}
        </>
      ) : null}
      {form.kind === "vm" ? (
        <>
          <Form.Item label="启动介质">
            <Radio.Group
              type="button"
              value={form.boot_mode}
              onChange={(v) => setForm((f) => ({ ...f, boot_mode: v }))}
            >
              <Radio value="containerDisk">ContainerDisk</Radio>
              <Radio value="iso">ISO 安装</Radio>
            </Radio.Group>
          </Form.Item>
          {form.boot_mode === "containerDisk" ? (
            <Form.Item label="Boot Image" required>
              <Input
                value={form.boot_image}
                onChange={(v) => setForm((f) => ({ ...f, boot_image: v }))}
                placeholder={VM_BOOT_IMAGE}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item label="ISO 镜像" required>
                <Select
                  data-testid="instance-iso-image-select"
                  value={form.boot_media_image_id}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, boot_media_image_id: v }))
                  }
                  loading={images.isLoading}
                  placeholder="选择 Ready 状态 ISO"
                  allowClear
                >
                  {(images.data?.items ?? []).map((image) => (
                    <Select.Option
                      key={String(image.id)}
                      value={String(image.id)}
                    >
                      {String(image.name ?? image.id)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item label="系统盘大小 GiB" required>
                <InputNumber
                  data-testid="instance-root-disk-size-input"
                  value={form.root_disk_size_gib}
                  min={1}
                  precision={0}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      root_disk_size_gib: Number(v ?? 1),
                    }))
                  }
                />
              </Form.Item>
            </>
          )}
          <Form.Item label="SSH 用户名">
            <Input
              value={form.ssh_username}
              onChange={(v) => setForm((f) => ({ ...f, ssh_username: v }))}
            />
          </Form.Item>
          <Form.Item label="SSH Key Ref">
            <Input
              value={form.ssh_key_ref}
              onChange={(v) => setForm((f) => ({ ...f, ssh_key_ref: v }))}
            />
          </Form.Item>
        </>
      ) : null}
      {form.kind === "gpu_container" ? (
        <>
          <Form.Item label="GPU 厂商">
            <Input
              value={form.gpu_vendor}
              onChange={(v) => setForm((f) => ({ ...f, gpu_vendor: v }))}
            />
          </Form.Item>
          <Form.Item label="GPU 型号">
            <Input
              value={form.gpu_model}
              onChange={(v) => setForm((f) => ({ ...f, gpu_model: v }))}
            />
          </Form.Item>
          <Form.Item label="GPU 数量">
            <InputNumber
              value={form.gpu_count}
              min={1}
              precision={0}
              onChange={(v) =>
                setForm((f) => ({ ...f, gpu_count: Number(v ?? 1) }))
              }
            />
          </Form.Item>
        </>
      ) : null}
      {form.kind === "sandbox" ? (
        <>
          <Form.Item label="Runtime Class" required>
            <Input value={form.sandbox_runtime_class} readOnly disabled />
          </Form.Item>
          <Form.Item label="启动命令">
            <Input.TextArea
              data-testid="sandbox-command-input"
              value={form.command}
              onChange={(v) => setForm((f) => ({ ...f, command: v }))}
              placeholder={'sh -c "uname -a; sleep 300"'}
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
          <Form.Item label="Session Timeout" required>
            <Select
              data-testid="sandbox-session-timeout-select"
              value={form.sandbox_session_timeout}
              onChange={(v) =>
                setForm((f) => ({ ...f, sandbox_session_timeout: v }))
              }
            >
              <Select.Option value="15m">15m</Select.Option>
              <Select.Option value="30m">30m</Select.Option>
              <Select.Option value="1h">1h</Select.Option>
              <Select.Option value="2h">2h</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="网络出口策略">
            <Select
              data-testid="sandbox-egress-policy-select"
              value={form.sandbox_network_egress_policy}
              onChange={(v) =>
                setForm((f) => ({ ...f, sandbox_network_egress_policy: v }))
              }
            >
              <Select.Option value="deny_all">deny_all</Select.Option>
              <Select.Option value="allowlist">allowlist</Select.Option>
              <Select.Option value="internet">internet</Select.Option>
            </Select>
          </Form.Item>
        </>
      ) : null}
      <Form.Item label="自动启动">
        <Switch
          checked={form.auto_start}
          onChange={(v) => setForm((f) => ({ ...f, auto_start: v }))}
        />
      </Form.Item>
      <Form.Item label="终止保护">
        <Switch
          checked={form.termination_protection}
          onChange={(v) =>
            setForm((f) => ({ ...f, termination_protection: v }))
          }
        />
      </Form.Item>
      <div className="flex justify-end gap-2">
        <Button onClick={handleCancel}>取消</Button>
        <Button
          type="primary"
          loading={create.isPending}
          onClick={() => create.mutateAsync()}
        >
          创建实例
        </Button>
      </div>
    </Form>
  );
}
