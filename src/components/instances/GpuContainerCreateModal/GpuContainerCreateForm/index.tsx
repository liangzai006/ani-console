import { Button, Form, Input, Modal, Space } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getGpuSpecAvailability, listGpuSchedulingQueues } from "@/api/gpu-inventory";
import { listNetworkSecurityGroups, listNetworkSubnets, listNetworkVpcs } from "@/api/network";
import { listRegistryImages } from "@/api/registry";
import { listFilesystems } from "@/api/storage/filesystems";
import { listVolumes } from "@/api/storage/volumes";
import { WizardSteps } from "@/components/common";
import type { ContainerNetworkItem } from "@/components/instances/ContainerNetworkFields";
import { hasDuplicateContainerMountPath } from "@/components/instances/ContainerStorageFields/storage";
import type {
  Filesystem,
  FormValues,
  GpuSchedulingQueue,
  GpuSchedulingQueueListResponse,
  GpuSpecOption,
  Volume,
} from "../types";
import { INITIAL_VALUES, isGpuSpecSelectable, TEMPORARY_RTX4090_GPU_SPEC_OPTIONS } from "../types";
import { GpuConfirmStep } from "./GpuConfirmStep";
import { GpuImageStep } from "./GpuImageStep";
import { GpuNetworkStorageStep } from "./GpuNetworkStorageStep";
import { GpuResourceStep } from "./GpuResourceStep";
import styles from "./index.module.css";
import { validateForm } from "@/lib/form";
import { showMessage } from "@/lib/feedback";
import { withId } from "@/lib/id";

const STEP_TITLES = ["基本信息", "资源配置", "摘要信息"];

type Props = {
  visible: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: FormValues, securityGroupId: string) => void;
};

export function GpuContainerCreateForm({ visible, submitting, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const vpcs = useQuery({
    meta: {
      errorNotification: {
        id: "vpcs",
        action: "VPC 列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-vpcs", "select"],
    queryFn: () => listNetworkVpcs({ limit: 50 }),
    enabled: visible,
  });
  const subnets = useQuery({
    meta: {
      errorNotification: {
        id: "subnets",
        action: "子网列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-subnets", "select", values.vpc_id],
    queryFn: () => listNetworkSubnets({ limit: 50, vpc_id: values.vpc_id || undefined }),
    enabled: visible && !!values.vpc_id,
  });
  const securityGroups = useQuery({
    meta: {
      errorNotification: {
        id: "security-groups",
        action: "安全组列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-security-groups", "select"],
    queryFn: () => listNetworkSecurityGroups({ limit: 50 }),
    enabled: visible,
  });
  const filesystems = useQuery({
    meta: {
      errorNotification: {
        id: "filesystems",
        action: "文件存储列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["filesystems", "select"],
    queryFn: () => listFilesystems({ limit: 50 }),
    enabled: visible,
  });
  const volumes = useQuery({
    meta: {
      errorNotification: {
        id: "volumes",
        action: "块存储卷列表加载",
        fallback: "加载失败，请稍后重试",
      },
    },
    queryKey: ["volumes", "gpu-container-create"],
    queryFn: () => listVolumes({ limit: 50, in_use: false }),
    enabled: visible,
  });
  const images = useQuery({
    meta: {
      errorNotification: {
        id: withId("registry-images", "gpu"),
        action: "GPU 容器镜像加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["registry-images", "gpu-create"],
    enabled: visible,
    queryFn: async () => (await listRegistryImages({ limit: 100, purpose: "gpu" })).items,
  });
  const gpuSpecAvailability = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-specs",
        action: "GPU 规格加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["gpu-specs", "availability"],
    enabled: visible,
    queryFn: getGpuSpecAvailability,
  });
  const gpuSchedulingQueues = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-queues",
        action: "GPU 调度队列加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["gpu-scheduling", "queues", "select"],
    enabled: visible,
    queryFn: async () =>
      (await listGpuSchedulingQueues()) as unknown as GpuSchedulingQueueListResponse,
  });

  const defaultSecurityGroup = values.vpc_id
    ? (securityGroups.data?.items ?? []).find((item) => item.vpc_id === values.vpc_id)
    : undefined;
  const selectedImage = images.data?.find((item) => item.image === values.image);
  const selectedFilesystem = (filesystems.data?.items ?? []).find(
    (item) => String(item.id) === values.filesystem_id,
  ) as Filesystem | undefined;
  const selectedVolume = (volumes.data?.items ?? []).find(
    (item) => String(item.id) === values.volume_id,
  ) as Volume | undefined;
  const apiGpuSpecs = gpuSpecAvailability.data?.items ?? [];
  const usingTemporaryGpuSpecs = gpuSpecAvailability.isSuccess && apiGpuSpecs.length === 0;
  const gpuSpecs: GpuSpecOption[] = usingTemporaryGpuSpecs
    ? TEMPORARY_RTX4090_GPU_SPEC_OPTIONS
    : apiGpuSpecs.map((spec) => ({
        spec_id: spec.spec_id,
        display_name: spec.spec_id,
        source: "api" as const,
        availability: spec,
      }));
  const schedulingQueues = (gpuSchedulingQueues.data?.items ?? []) as GpuSchedulingQueue[];
  const selectedGpuSpec = gpuSpecs.find((item) => item.spec_id === values.spec_id);
  const selectedSchedulingQueue = schedulingQueues.find((item) => item.name === values.queue_name);
  const hasAvailableGpuSpec = gpuSpecs.some(isGpuSpecSelectable);
  const hasAvailableQueue = schedulingQueues.some((item) => item.status?.state !== "closed");

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(INITIAL_VALUES);
      setValues(INITIAL_VALUES);
      setStep(0);
    }
  }, [form, visible]);

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

  const setFieldValue = (field: keyof FormValues, value: string | boolean) => {
    form.setFieldValue(field, value);
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = () => {
    if (hasDuplicateContainerMountPath(values)) {
      setStep(1);
      showMessage({ type: "warning", content: "请为块存储卷和文件存储设置不同的挂载路径" });
      return;
    }
    onSubmit(values, String(defaultSecurityGroup?.id ?? ""));
  };

  return (
    <Modal
      title="创建 GPU 容器实例"
      visible={visible}
      onCancel={onCancel}
      unmountOnExit
      footer={
        <Space>
          <Button onClick={onCancel} disabled={submitting}>
            取消
          </Button>
          {step > 0 ? (
            <Button onClick={() => setStep((current) => current - 1)} disabled={submitting}>
              上一步
            </Button>
          ) : null}
          <Button
            type="primary"
            onClick={step === STEP_TITLES.length - 1 ? submit : next}
            loading={submitting}
            disabled={
              step === 0 &&
              (!images.data?.length ||
                gpuSpecAvailability.isLoading ||
                gpuSchedulingQueues.isLoading ||
                gpuSpecAvailability.isError ||
                gpuSchedulingQueues.isError ||
                !hasAvailableGpuSpec ||
                !hasAvailableQueue)
            }
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
            onValuesChange={(changedValues) =>
              setValues((current) => ({ ...current, ...changedValues }))
            }
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
                <GpuImageStep images={images.data ?? []} loading={images.isLoading} />
                <GpuResourceStep
                  values={values}
                  specs={gpuSpecs}
                  queues={schedulingQueues}
                  quotaRemaining={gpuSpecAvailability.data?.quota_remaining ?? 0}
                  specsLoading={gpuSpecAvailability.isLoading}
                  queuesLoading={gpuSchedulingQueues.isLoading}
                  specsError={gpuSpecAvailability.isError}
                  queuesError={gpuSchedulingQueues.isError}
                  usingTemporarySpecs={usingTemporaryGpuSpecs}
                />
              </>
            ) : null}
            {step === 1 ? (
              <GpuNetworkStorageStep
                onFieldValueChange={setFieldValue}
                values={values}
                vpcs={(vpcs.data?.items ?? []) as ContainerNetworkItem[]}
                subnets={(subnets.data?.items ?? []) as ContainerNetworkItem[]}
                volumes={(volumes.data?.items ?? []) as Volume[]}
                filesystems={(filesystems.data?.items ?? []) as Filesystem[]}
                defaultSecurityGroup={defaultSecurityGroup as ContainerNetworkItem | undefined}
                networkLoading={vpcs.isLoading || subnets.isLoading}
              />
            ) : null}
            {step === 2 ? (
              <GpuConfirmStep
                values={values}
                image={selectedImage}
                volume={selectedVolume}
                filesystem={selectedFilesystem}
                gpuSpec={selectedGpuSpec}
                schedulingQueue={selectedSchedulingQueue}
                securityGroupName={String(defaultSecurityGroup?.name ?? "平台自动配置")}
              />
            ) : null}
          </Form>
        </div>
      </div>
    </Modal>
  );
}
