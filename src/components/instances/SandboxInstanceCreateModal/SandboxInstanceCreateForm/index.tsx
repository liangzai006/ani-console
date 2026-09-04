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
import { useEffect, useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { listOrThrow } from "@/lib/api-list";
import {
  INITIAL_VALUES,
  getTemplateComputeSpec,
  type FormValues,
  type SandboxTemplate,
} from "../types";
import { SandboxConfirmStep } from "./SandboxConfirmStep";
import { SandboxResourceStep } from "./SandboxResourceStep";
import { SandboxRuntimeStep } from "./SandboxRuntimeStep";
import { SandboxTemplateStep } from "./SandboxTemplateStep";

const STEP_TITLES = ["名称", "模板", "规格", "会话与网络", "确认"];

type Props = {
  visible: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: FormValues, template: SandboxTemplate) => void;
};

export function SandboxInstanceCreateForm({
  visible,
  submitting,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
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
  const selectedTemplate = items.find((item) => item.id === values.template_id);

  useEffect(() => {
    if (!visible) return;
    form.setFieldsValue(INITIAL_VALUES);
    setValues(INITIAL_VALUES);
    setStep(0);
  }, [form, visible]);

  useEffect(() => {
    if (!visible || values.template_id || !items[0]) return;
    const nextValues = {
      template_id: items[0].id,
      compute_spec: getTemplateComputeSpec(items[0]),
    };
    form.setFieldsValue(nextValues);
    setValues((current) => ({ ...current, ...nextValues }));
  }, [form, items, values.template_id, visible]);

  const selectTemplate = (templateId: string) => {
    const template = items.find((item) => item.id === templateId);
    const nextValues = {
      template_id: templateId,
      compute_spec: getTemplateComputeSpec(template),
    };
    form.setFieldsValue(nextValues);
    setValues((current) => ({ ...current, ...nextValues }));
  };

  const next = async () => {
    try {
      await form.validate();
      setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
    } catch {
      Message.warning("请先完成当前步骤的必填项");
    }
  };

  return (
    <div className="flex h-[560px] min-h-0 flex-col">
      <Steps current={step + 1} style={{ marginBottom: 24 }}>
        {STEP_TITLES.map((title) => (
          <Steps.Step key={title} title={title} />
        ))}
      </Steps>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
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
                为 Sandbox 设置易于识别的名称。
              </Typography.Paragraph>
              <Form.Item
                field="name"
                label="名称"
                rules={[{ required: true, message: "请输入名称" }]}
              >
                <Input allowClear placeholder="例如：agent-dev-sandbox" />
              </Form.Item>
            </>
          ) : null}
          {step === 1 ? (
            <SandboxTemplateStep
              templates={items}
              loading={templates.isLoading}
              error={templates.isError}
              onRetry={() => void templates.refetch()}
              onChange={selectTemplate}
            />
          ) : null}
          {step === 2 ? <SandboxResourceStep /> : null}
          {step === 3 ? <SandboxRuntimeStep values={values} /> : null}
          {step === 4 && selectedTemplate ? (
            <SandboxConfirmStep values={values} template={selectedTemplate} />
          ) : null}
        </Form>
      </div>
      <div className="flex flex-none justify-end pt-5">
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
              step === STEP_TITLES.length - 1 && selectedTemplate
                ? () => onSubmit(values, selectedTemplate)
                : next
            }
            loading={submitting}
            disabled={
              (step === 1 &&
                (templates.isLoading || templates.isError || !items.length)) ||
              (step === STEP_TITLES.length - 1 && !selectedTemplate)
            }
          >
            {step === STEP_TITLES.length - 1 ? "提交创建" : "下一步"}
          </Button>
        </Space>
      </div>
    </div>
  );
}
