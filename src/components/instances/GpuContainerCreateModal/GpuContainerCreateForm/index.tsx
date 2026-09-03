import {
  Button,
  Form,
  Input,
  Message,
  Space,
  Steps,
  Typography,
} from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { listOrThrow } from "@/lib/api-list";
import type {
  Filesystem,
  FormValues,
  GpuSchedulingQueue,
  GpuSchedulingQueueListResponse,
  GpuSpecAvailabilityListResponse,
  GpuSpecOption,
  RegistryImage,
} from "../types";
import {
  INITIAL_VALUES,
  isGpuSpecSelectable,
  TEMPORARY_RTX4090_GPU_SPEC_OPTIONS,
} from "../types";
import { GpuConfirmStep } from "./GpuConfirmStep";
import { GpuImageStep } from "./GpuImageStep";
import { GpuNetworkStorageStep } from "./GpuNetworkStorageStep";
import type { NetworkItem } from "./GpuNetworkStorageStep";
import { GpuResourceStep } from "./GpuResourceStep";
import styles from "./index.module.css";

type RegistryResponse = { items: RegistryImage[]; total: number };
const STEP_TITLES = ["名称", "镜像", "规格与调度", "网络与存储", "确认"];

type Props = {
  visible: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: FormValues, securityGroupId: string) => void;
};

export function GpuContainerCreateForm({
  visible,
  submitting,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const vpcs = useQuery({
    queryKey: ["network-vpcs", "select"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/vpcs", { params: { query: { limit: 50 } } }),
      ),
    enabled: visible,
  });
  const subnets = useQuery({
    queryKey: ["network-subnets", "select", values.vpc_id],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/subnets", {
          params: { query: { limit: 50, vpc_id: values.vpc_id || undefined } },
        }),
      ),
    enabled: visible && !!values.vpc_id,
  });
  const securityGroups = useQuery({
    queryKey: ["network-security-groups", "select"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/security-groups", {
          params: { query: { limit: 50 } },
        }),
      ),
    enabled: visible,
  });
  const filesystems = useQuery({
    queryKey: ["filesystems", "select"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/filesystems", { params: { query: { limit: 50 } } }),
      ),
    enabled: visible,
  });
  const images = useQuery({
    queryKey: ["registry-images", "gpu-create"],
    enabled: visible,
    queryFn: async () => {
      const request = coreApi.GET as unknown as (
        path: string,
        options: { params: { query: never } },
      ) => Promise<{ data?: RegistryResponse; error?: unknown }>;
      const { data, error } = await request("/registry/images", {
        params: { query: asUncontractedQuery({ limit: 100, purpose: "gpu" }) },
      });
      if (error || !data) throw error ?? new Error("GPU 镜像列表未返回结果");
      // TODO: Registry 后端确认按 purpose 过滤后，移除此处创建表单的本地兜底过滤。
      return data.items.filter((item) => item.purpose === "gpu");
    },
  });
  const gpuSpecAvailability = useQuery({
    queryKey: ["gpu-specs", "availability"],
    enabled: visible,
    queryFn: async () => {
      const request = coreApi.GET as unknown as (
        path: string,
      ) => Promise<{
        data?: GpuSpecAvailabilityListResponse;
        error?: unknown;
      }>;
      const { data, error } = await request("/gpu-specs/availability");
      if (error || !data) {
        throw error ?? new Error("GPU 规格可用性未返回结果");
      }
      return data;
    },
  });
  const gpuSchedulingQueues = useQuery({
    queryKey: ["gpu-scheduling", "queues", "select"],
    enabled: visible,
    queryFn: async () => {
      const request = coreApi.GET as unknown as (
        path: string,
      ) => Promise<{
        data?: GpuSchedulingQueueListResponse;
        error?: unknown;
      }>;
      const { data, error } = await request("/gpu-scheduling/queues");
      if (error || !data) {
        throw error ?? new Error("GPU 调度队列未返回结果");
      }
      return data;
    },
  });

  const defaultSecurityGroup = (securityGroups.data?.items ?? []).find(
    (item) => !values.vpc_id || item.vpc_id === values.vpc_id,
  );
  const selectedImage = images.data?.find(
    (item) => item.image === values.image,
  );
  const selectedFilesystem = (filesystems.data?.items ?? []).find(
    (item) => String(item.id) === values.filesystem_id,
  ) as Filesystem | undefined;
  const apiGpuSpecs = gpuSpecAvailability.data?.items ?? [];
  const usingTemporaryGpuSpecs =
    gpuSpecAvailability.isSuccess && apiGpuSpecs.length === 0;
  const gpuSpecs: GpuSpecOption[] = usingTemporaryGpuSpecs
    ? TEMPORARY_RTX4090_GPU_SPEC_OPTIONS
    : apiGpuSpecs.map((spec) => ({
        spec_id: spec.spec_id,
        display_name: spec.spec_id,
        source: "api" as const,
        availability: spec,
      }));
  const schedulingQueues = (gpuSchedulingQueues.data?.items ??
    []) as GpuSchedulingQueue[];
  const selectedGpuSpec = gpuSpecs.find(
    (item) => item.spec_id === values.spec_id,
  );
  const selectedSchedulingQueue = schedulingQueues.find(
    (item) => item.name === values.queue_name,
  );
  const hasAvailableGpuSpec = gpuSpecs.some(isGpuSpecSelectable);
  const hasAvailableQueue = schedulingQueues.some(
    (item) => item.status?.state !== "closed",
  );

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(INITIAL_VALUES);
      setValues(INITIAL_VALUES);
      setStep(0);
    }
  }, [form, visible]);

  const next = async () => {
    try {
      await form.validate();
      setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
    } catch {
      Message.warning("请先完成当前步骤的必填项");
    }
  };

  const setFieldValue = (field: keyof FormValues, value: string | boolean) => {
    form.setFieldValue(field, value);
    setValues((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className={styles.form}>
      <Steps current={step + 1} style={{ marginBottom: 24 }}>
        {STEP_TITLES.map((title) => (
          <Steps.Step key={title} title={title} />
        ))}
      </Steps>
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
              <Typography.Paragraph type="secondary">
                为 GPU 容器实例设置易于识别的名称。
              </Typography.Paragraph>
              <Form.Item
                field="name"
                label="名称"
                rules={[{ required: true, message: "请输入名称" }]}
              >
                <Input allowClear />
              </Form.Item>
            </>
          ) : null}
          {step === 1 ? (
            <GpuImageStep
              images={images.data ?? []}
              loading={images.isLoading}
            />
          ) : null}
          {step === 2 ? (
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
          ) : null}
          {step === 3 ? (
            <GpuNetworkStorageStep
              onFieldValueChange={setFieldValue}
              values={values}
              vpcs={(vpcs.data?.items ?? []) as NetworkItem[]}
              subnets={(subnets.data?.items ?? []) as NetworkItem[]}
              filesystems={(filesystems.data?.items ?? []) as Filesystem[]}
              defaultSecurityGroup={
                defaultSecurityGroup as NetworkItem | undefined
              }
              networkLoading={vpcs.isLoading || subnets.isLoading}
            />
          ) : null}
          {step === 4 ? (
            <GpuConfirmStep
              values={values}
              image={selectedImage}
              filesystem={selectedFilesystem}
              gpuSpec={selectedGpuSpec}
              schedulingQueue={selectedSchedulingQueue}
              securityGroupName={String(
                defaultSecurityGroup?.name ?? "平台自动配置",
              )}
            />
          ) : null}
        </Form>
      </div>
      <div className={styles.actions}>
        <Space>
          <Button onClick={onCancel} disabled={submitting}>
            取消
          </Button>
          {step > 0 ? (
            <Button
              onClick={() => setStep((current) => current - 1)}
              disabled={submitting}
            >
              上一步
            </Button>
          ) : null}
          <Button
            type="primary"
            onClick={
              step === STEP_TITLES.length - 1
                ? () => onSubmit(values, String(defaultSecurityGroup?.id ?? ""))
                : next
            }
            loading={submitting}
            disabled={
              (step === 1 && !images.data?.length) ||
              (step === 2 &&
                (gpuSpecAvailability.isLoading ||
                  gpuSchedulingQueues.isLoading ||
                  gpuSpecAvailability.isError ||
                  gpuSchedulingQueues.isError ||
                  !hasAvailableGpuSpec ||
                  !hasAvailableQueue))
            }
          >
            {step === STEP_TITLES.length - 1 ? "提交创建" : "下一步"}
          </Button>
        </Space>
      </div>
    </div>
  );
}
