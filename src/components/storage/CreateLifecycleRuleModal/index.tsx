import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, InputNumber, Modal, Select } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { createBucketLifecycleRule, type StorageBucketLifecycleRule } from "@/api/storage/buckets";
import { showApiError } from "@/lib/api-error";

type LifecycleRule = StorageBucketLifecycleRule;

export function CreateLifecycleRuleModal({
  visible,
  bucketId,
  rule,
  onCancel,
}: {
  visible: boolean;
  bucketId: string;
  rule?: LifecycleRule;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [expireDays, setExpireDays] = useState(90);
  const [toInfrequentDays, setToInfrequentDays] = useState(30);
  const [enabled, setEnabled] = useState<boolean>(true);
  useEffect(() => {
    if (!visible) return;
    setName(rule?.name ?? "");
    setPrefix(rule?.prefix ?? "");
    setExpireDays(rule?.expire_days ?? 90);
    setToInfrequentDays(rule?.to_infrequent_days ?? 30);
    setEnabled(rule?.enabled ?? true);
  }, [rule, visible]);
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      if (!name.trim()) throw new Error("请输入规则名称");
      return createBucketLifecycleRule(bucketId, {
        name: name.trim(),
        prefix: prefix.trim(),
        expire_days: expireDays,
        to_infrequent_days: toInfrequentDays,
        enabled,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bucket-lifecycle-rules", bucketId] });
      qc.invalidateQueries({ queryKey: ["bucket", bucketId] });
      onCancel();
    },
    onError: (error) => showApiError(error),
  });
  return (
    <Modal
      visible={visible}
      title={rule ? "编辑生命周期规则" : "添加生命周期规则"}
      onCancel={onCancel}
      onOk={() => create.mutateAsync(undefined)}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="规则名称" required>
          <Input value={name} onChange={setName} placeholder="例如：日志过期" maxLength={128} />
        </Form.Item>
        <Form.Item label="前缀">
          <Input
            value={prefix}
            onChange={setPrefix}
            placeholder="例如：logs/，留空表示整个桶"
            maxLength={1024}
          />
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item label="转低频天数" required>
            <InputNumber
              value={toInfrequentDays}
              min={1}
              precision={0}
              className="w-full"
              onChange={(value) => setToInfrequentDays(Number(value ?? 1))}
            />
          </Form.Item>
          <Form.Item label="过期天数" required>
            <InputNumber
              value={expireDays}
              min={1}
              precision={0}
              className="w-full"
              onChange={(value) => setExpireDays(Number(value ?? 1))}
            />
          </Form.Item>
        </div>
        <Form.Item label="启用">
          <Select
            value={enabled ? "enabled" : "disabled"}
            onChange={(value) => setEnabled(value === "enabled")}
          >
            <Select.Option value="enabled">启用</Select.Option>
            <Select.Option value="disabled">停用</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
