import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Typography,
} from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { listInstances, type InstanceRecord } from "@/api/instances";
import { createVolume, type StorageVolume } from "@/api/storage/volumes";
import { showApiError } from "@/lib/api-error";
import { getErrorMessage } from "@/lib/errors";

type Volume = StorageVolume;
type Instance = InstanceRecord;

const STORAGE_CLASS_OPTIONS = [{ value: "ani-block", label: "ani-block" }];

const INSTANCE_ROUTE: Record<string, string> = {
  vm: "/vm-instances",
  container: "/container-instances",
  gpu_container: "/gpu-instances",
};

export function CreateVolumeModal({
  visible,
  onCancel,
  onCreated,
}: {
  visible: boolean;
  onCancel: () => void;
  onCreated?: (volume: Volume) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [sizeGiB, setSizeGiB] = useState(40);
  const [storageClass, setStorageClass] = useState("ani-block");
  const [encrypted, setEncrypted] = useState(false);
  const [mountInstanceId, setMountInstanceId] = useState("");
  const instances = useQuery({
    queryKey: ["instances", "volume-create"],
    queryFn: () => listInstances({ limit: 100, mountable: true }),
    enabled: visible,
  });
  // TODO: 实例接口确认按 mountable 过滤后，移除此处创建表单的本地兜底过滤。
  const instanceItems = ((instances.data?.items ?? []) as Instance[]).filter(
    (item) => item.kind && INSTANCE_ROUTE[item.kind],
  );
  useEffect(() => {
    if (!mountInstanceId || instanceItems.some((item) => item.id === mountInstanceId)) return;
    setMountInstanceId("");
  }, [instanceItems, mountInstanceId]);
  const reset = () => {
    setName("");
    setSizeGiB(40);
    setStorageClass("ani-block");
    setEncrypted(false);
    setMountInstanceId("");
  };
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("请输入卷名称");
      if (!Number.isInteger(sizeGiB) || sizeGiB < 1)
        throw new Error("容量必须是大于 0 的整数（GiB）");
      if (!storageClass.trim()) throw new Error("请选择类型");
      const selectedInstance = instanceItems.find((item) => item.id === mountInstanceId);
      const submitData = {
        name: trimmedName,
        size_gib: sizeGiB,
        storage_class: storageClass.trim(),
        encrypted,
        mount_instance_id: selectedInstance ? selectedInstance.id : undefined,
        mount_route: selectedInstance ? INSTANCE_ROUTE[selectedInstance.kind] : undefined,
      };
      return createVolume(submitData);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["volumes"] });
      reset();
      onCreated?.(data);
      onCancel();
    },
    onError: (error) => showApiError(error),
  });
  return (
    <Modal
      visible={visible}
      title="创建块存储卷"
      onCancel={() => {
        reset();
        onCancel();
      }}
      onOk={() => create.mutateAsync(undefined)}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="名称" required>
          <Input
            value={name}
            onChange={setName}
            placeholder="请输入卷名称"
            maxLength={64}
            showWordLimit
          />
        </Form.Item>
        <Form.Item label="容量 (GiB)" required>
          <InputNumber
            value={sizeGiB}
            min={1}
            precision={0}
            className="w-full"
            onChange={(value) => setSizeGiB(Number(value ?? 1))}
          />
        </Form.Item>
        <Form.Item label="类型" required>
          <Select value={storageClass} onChange={setStorageClass} placeholder="请选择类型">
            {STORAGE_CLASS_OPTIONS.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="是否加密">
          <Switch checked={encrypted} onChange={setEncrypted} />
        </Form.Item>
        <Form.Item label="挂载实例">
          <Select
            value={mountInstanceId || undefined}
            onChange={setMountInstanceId}
            loading={instances.isLoading}
            allowClear
            placeholder="可选，创建后挂载到实例"
            showSearch
            filterOption={(inputValue, option) =>
              String(option.props.children).toLowerCase().includes(inputValue.toLowerCase())
            }
          >
            {instanceItems.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name} · {item.kind}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {instances.error ? (
          <Alert
            type="error"
            showIcon
            content={getErrorMessage(instances.error, "实例列表加载失败")}
            className="mb-4"
          />
        ) : null}
        <Typography.Text type="secondary">
          创建后可在详情页创建快照；卷被实例挂载时无法删除。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
