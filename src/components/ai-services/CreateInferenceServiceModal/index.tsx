import {
  Alert,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Radio,
  Select,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createInferenceService } from "@/api/ai-services/inference";
import { getModel, listModels } from "@/api/ai-services/models";
import { getGpuSpecAvailability, listGpuSpecs } from "@/api/gpu-inventory";
import {
  listRegistryArtifacts,
  listRegistryProjects,
  listRegistryRepositories,
} from "@/api/registry";
import { showApiError } from "@/lib/api-error";
import { getErrorMessage } from "@/lib/errors";
import {
  DEFAULT_GPU_INSTANCE_COMPUTE_SPEC,
  GPU_INSTANCE_COMPUTE_SPECS,
  INSTANCE_COMPUTE_SPEC_BY_VALUE,
  type GpuInstanceComputeSpec,
} from "@/lib/instance-compute-specs";
import { getLatestModelVersion } from "@/lib/model-catalog";
import { getImageSelectionLabel } from "@/lib/render";

type RuntimeImage = {
  id: string;
  label: string;
};

type RuntimeImageMode = "registry" | "manual";

type GpuSpec = {
  id: string;
  name: string;
  gpu_type: string;
  gpu_mode?: string;
  memory_total_mb?: number;
  shares: number;
  mb_per_share: number;
  available: boolean;
};

type GpuSpecListResponse = {
  items: GpuSpec[];
};

type GpuSpecAvailability = {
  spec_id: string;
  status: "available" | "full" | "device_full" | "unavailable";
  available_count: number;
  gpu_count?: number;
};

type GpuSpecAvailabilityListResponse = {
  items: GpuSpecAvailability[];
  quota_remaining: number;
};

function isGpuSpecSelectable(spec: GpuSpec, availability?: GpuSpecAvailability) {
  return spec.available && availability?.status === "available" && availability.available_count > 0;
}

function gpuSpecLabel(spec: GpuSpec, availability?: GpuSpecAvailability) {
  const name = spec.name || spec.gpu_type || spec.id;
  const mode = spec.gpu_mode === "vgpu" ? "vGPU" : "整卡";
  if (!availability) return `${name} · ${mode} · 暂无可用性数据`;
  if (availability.status === "available") {
    return `${name} · ${mode} · 剩余 ${availability.available_count}`;
  }
  const statusLabels = {
    full: "配额已满",
    device_full: "设备已满",
    unavailable: "暂无匹配节点",
  } as const;
  return `${name} · ${mode} · ${statusLabels[availability.status]}`;
}

type CreateInferenceServiceModalProps = {
  visible: boolean;
  onCancel: () => void;
  initialServiceName?: string;
  initialModelId?: string;
  initialModelVersionId?: string;
};

export function CreateInferenceServiceModal({
  visible,
  onCancel,
  initialServiceName,
  initialModelId,
  initialModelVersionId,
}: CreateInferenceServiceModalProps) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [modelVersionId, setModelVersionId] = useState("");
  const [replicas, setReplicas] = useState(1);
  const [computeSpec, setComputeSpec] = useState<GpuInstanceComputeSpec>(
    DEFAULT_GPU_INSTANCE_COMPUTE_SPEC,
  );
  const [acceleratorSpecId, setAcceleratorSpecId] = useState("");
  const [runtimeImageMode, setRuntimeImageMode] = useState<RuntimeImageMode>("registry");
  const [runtimeImageId, setRuntimeImageId] = useState("");
  const [runtimeImageRef, setRuntimeImageRef] = useState("");
  const models = useQuery({
    queryKey: ["models", "inference-service-create"],
    enabled: visible,
    queryFn: () => listModels({ status: "ready", limit: 100 }),
  });
  const selectedModelSummary = useMemo(
    () => (models.data?.items ?? []).find((item) => item.id === modelId),
    [modelId, models.data?.items],
  );
  const modelDetail = useQuery({
    queryKey: ["model", modelId],
    enabled: visible && Boolean(modelId),
    queryFn: () => getModel(modelId),
  });
  const selectedModel = modelDetail.data ?? selectedModelSummary;
  const modelVersions = useMemo(
    () => modelDetail.data?.versions ?? [],
    [modelDetail.data?.versions],
  );
  const selectedModelVersion = useMemo(
    () => modelVersions.find((item) => item.id === modelVersionId),
    [modelVersionId, modelVersions],
  );

  const gpuSpecs = useQuery({
    queryKey: ["gpu-specs", "inference-service-create"],
    enabled: visible,
    queryFn: async () =>
      (await listGpuSpecs({ available: true, limit: 100 })) as unknown as GpuSpecListResponse,
  });

  const gpuSpecAvailability = useQuery({
    queryKey: ["gpu-specs", "availability", "inference-service-create"],
    enabled: visible,
    queryFn: async () => (await getGpuSpecAvailability()) as GpuSpecAvailabilityListResponse,
  });

  const availabilityBySpecId = useMemo(
    () => new Map((gpuSpecAvailability.data?.items ?? []).map((item) => [item.spec_id, item])),
    [gpuSpecAvailability.data?.items],
  );
  const selectedGpuSpec = (gpuSpecs.data?.items ?? []).find(
    (item) => item.id === acceleratorSpecId,
  );
  const selectedGpuAvailability = selectedGpuSpec
    ? availabilityBySpecId.get(selectedGpuSpec.id)
    : undefined;

  const runtimeImages = useQuery({
    queryKey: ["inference-runtime-images"],
    enabled: visible && runtimeImageMode === "registry" && Boolean(selectedModelVersion),
    queryFn: async () => {
      const projectData = await listRegistryProjects({ limit: 50 });
      const images: RuntimeImage[] = [];
      for (const project of projectData?.items ?? []) {
        const repoData = await listRegistryRepositories(project.name, { limit: 50 });
        for (const repository of repoData?.items ?? []) {
          const artifactData = await listRegistryArtifacts(project.name, repository.name, {
            limit: 50,
          });
          for (const artifact of artifactData?.items ?? []) {
            for (const tag of artifact.tags) {
              const id = `${artifact.project}/${artifact.repository}:${tag}`;
              images.push({
                id,
                label: getImageSelectionLabel({
                  image: id,
                  size_bytes: artifact.size_bytes,
                }),
              });
            }
          }
        }
      }
      return Array.from(new Map(images.map((image) => [image.id, image])).values());
    },
  });

  const runtimeImage = (runtimeImages.data ?? []).find((image) => image.id === runtimeImageId);

  useEffect(() => {
    if (!visible) return;
    setName(initialServiceName ?? "");
    setModelId(initialModelId ?? "");
    setModelVersionId(initialModelVersionId ?? "");
    setReplicas(1);
    setComputeSpec(DEFAULT_GPU_INSTANCE_COMPUTE_SPEC);
    setAcceleratorSpecId("");
    setRuntimeImageMode("registry");
    setRuntimeImageId("");
    setRuntimeImageRef("");
  }, [initialModelId, initialModelVersionId, initialServiceName, visible]);

  useEffect(() => {
    const items = models.data?.items ?? [];
    if (!visible || items.length === 0) return;
    setModelId((current) => {
      if (initialModelId && items.some((item) => item.id === initialModelId)) {
        return initialModelId;
      }
      if (items.some((item) => item.id === current)) return current;
      return items[0].id;
    });
  }, [initialModelId, models.data?.items, visible]);

  useEffect(() => {
    if (!visible || !modelDetail.data || modelVersions.length === 0) return;
    setModelVersionId((current) => {
      if (
        initialModelVersionId &&
        modelVersions.some((item) => item.id === initialModelVersionId)
      ) {
        return initialModelVersionId;
      }
      if (modelVersions.some((item) => item.id === current)) return current;
      return getLatestModelVersion(modelDetail.data)?.id ?? modelVersions[0].id;
    });
  }, [initialModelVersionId, modelDetail.data, modelVersions, visible]);

  useEffect(() => {
    if (!visible || !gpuSpecs.data || !gpuSpecAvailability.data) return;
    const specs = gpuSpecs.data.items;
    setAcceleratorSpecId((current) => {
      if (current === "cpu") return current;
      const currentSpec = specs.find((spec) => spec.id === current);
      if (
        currentSpec &&
        isGpuSpecSelectable(currentSpec, availabilityBySpecId.get(currentSpec.id))
      ) {
        return current;
      }
      return (
        specs.find((spec) => isGpuSpecSelectable(spec, availabilityBySpecId.get(spec.id)))?.id ??
        "cpu"
      );
    });
  }, [availabilityBySpecId, gpuSpecAvailability.data, gpuSpecs.data, visible]);

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !modelVersionId) throw new Error("请完整填写服务名称并选择模型版本");
      if (!selectedModelVersion) throw new Error("请选择有效的模型版本");
      const manualImageRef = runtimeImageRef.trim();
      if (runtimeImageMode === "registry" && !runtimeImage) {
        throw new Error("请选择 Registry 运行镜像");
      }
      if (runtimeImageMode === "manual" && !manualImageRef) {
        throw new Error("请输入运行镜像地址");
      }
      if (!Number.isInteger(replicas) || replicas < 1) {
        throw new Error("副本必须是大于 0 的整数");
      }
      const resources = INSTANCE_COMPUTE_SPEC_BY_VALUE[computeSpec];
      let accelerator:
        | {
            spec_id: string;
            count_per_replica: number;
            memory?: number;
          }
        | undefined;
      if (acceleratorSpecId !== "cpu") {
        if (!selectedGpuSpec || !isGpuSpecSelectable(selectedGpuSpec, selectedGpuAvailability)) {
          throw new Error("请选择当前可用的 GPU 规格");
        }
        const memory =
          selectedGpuSpec.gpu_mode === "vgpu" ? selectedGpuSpec.mb_per_share : undefined;
        if (selectedGpuSpec.gpu_mode === "vgpu" && !memory) {
          throw new Error("所选 vGPU 规格缺少显存份额信息");
        }
        accelerator = {
          spec_id: selectedGpuSpec.id,
          count_per_replica: Math.max(1, selectedGpuAvailability?.gpu_count ?? 1),
          ...(memory ? { memory } : {}),
        };
      }
      const submitData = {
        name: name.trim(),
        model: modelVersionId,
        model_version_id: modelVersionId,
        served_model_name: selectedModel?.name,
        ...(runtimeImageMode === "registry"
          ? { image_id: runtimeImage!.id }
          : { image_ref: manualImageRef }),
        replicas,
        placement_mode: "auto" as const,
        resources: {
          cpu: resources.cpu,
          memory: resources.memory,
          ...(accelerator ? { accelerator } : {}),
        },
      };
      return createInferenceService(submitData);
    },
    onSuccess: () => {
      Message.success("推理服务部署请求已提交");
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
      onCancel();
    },
    onError: (error) => showApiError(error),
  });

  return (
    <Modal
      visible={visible}
      title="部署推理服务"
      okText="开始部署"
      onCancel={() => {
        onCancel();
      }}
      onOk={() => create.mutateAsync()}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="服务名称" required>
          <Input value={name} onChange={setName} placeholder="例如 qwen-service" maxLength={63} />
        </Form.Item>
        <Form.Item label="模型" required>
          <Select
            value={modelId}
            loading={models.isLoading}
            disabled={(models.data?.items.length ?? 0) === 0}
            placeholder="请选择已就绪的模型"
            options={(models.data?.items ?? []).map((item) => ({
              value: item.id,
              label: item.display_name || item.name,
            }))}
            onChange={(value) => {
              setModelId(value);
              setModelVersionId("");
            }}
          />
        </Form.Item>
        <Form.Item label="模型版本" required>
          <Select
            value={modelVersionId}
            onChange={setModelVersionId}
            loading={modelDetail.isLoading}
            disabled={modelVersions.length === 0}
            placeholder="请选择已就绪的模型版本"
            options={modelVersions.map((item) => ({
              value: item.id,
              label: item.version,
            }))}
          />
        </Form.Item>
        {models.error ? (
          <Alert
            type="warning"
            showIcon
            content={getErrorMessage(models.error, "模型列表加载失败")}
          />
        ) : modelDetail.error ? (
          <Alert
            type="warning"
            showIcon
            content={getErrorMessage(modelDetail.error, "模型版本加载失败")}
          />
        ) : !models.isLoading &&
          !modelDetail.isLoading &&
          selectedModel &&
          modelVersions.length === 0 ? (
          <Alert type="warning" showIcon content="所选模型暂无可部署版本" />
        ) : null}
        <Form.Item label="镜像来源" required>
          <Radio.Group type="button" value={runtimeImageMode} onChange={setRuntimeImageMode}>
            <Radio value="registry">镜像仓库</Radio>
            <Radio value="manual">手动输入</Radio>
          </Radio.Group>
        </Form.Item>
        {runtimeImageMode === "registry" ? (
          <Form.Item label="运行镜像" required>
            <Select
              value={runtimeImageId}
              onChange={setRuntimeImageId}
              loading={runtimeImages.isLoading}
              disabled={(runtimeImages.data?.length ?? 0) === 0}
              placeholder="请选择 Registry 中的运行镜像"
              showSearch
              options={(runtimeImages.data ?? []).map((image) => ({
                value: image.id,
                label: image.label,
              }))}
            />
          </Form.Item>
        ) : (
          <Form.Item
            label="镜像地址"
            required
            extra="建议填写 digest 固定地址（image@sha256:...）。Tag 地址只能由当前租户 Registry 解析；外部私有镜像还需集群具备相应拉取权限。"
          >
            <Input
              value={runtimeImageRef}
              onChange={setRuntimeImageRef}
              placeholder="例如 registry.example.com/project/image@sha256:..."
            />
          </Form.Item>
        )}
        {runtimeImageMode === "registry" && runtimeImages.error ? (
          <Alert
            type="warning"
            showIcon
            content={getErrorMessage(runtimeImages.error, "运行镜像加载失败")}
          />
        ) : runtimeImageMode === "registry" &&
          !runtimeImages.isLoading &&
          selectedModelVersion &&
          (runtimeImages.data?.length ?? 0) === 0 ? (
          <Alert type="warning" showIcon content="Registry 中暂无可选运行镜像" />
        ) : null}
        <Form.Item label="推理引擎">
          <Input value="平台默认启动命令与环境" readOnly />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item label="加速器规格" required>
            <Select
              value={acceleratorSpecId}
              onChange={setAcceleratorSpecId}
              loading={gpuSpecs.isLoading || gpuSpecAvailability.isLoading}
              placeholder="请选择 CPU 或可用 GPU 规格"
              showSearch
              options={[
                { value: "cpu", label: "CPU（不申请 GPU）" },
                ...(gpuSpecs.data?.items ?? []).map((spec) => {
                  const availability = availabilityBySpecId.get(spec.id);
                  return {
                    value: spec.id,
                    label: gpuSpecLabel(spec, availability),
                    disabled: !isGpuSpecSelectable(spec, availability),
                  };
                }),
              ]}
            />
          </Form.Item>
          <Form.Item label="CPU / 内存" required>
            <Select
              value={computeSpec}
              onChange={setComputeSpec}
              options={GPU_INSTANCE_COMPUTE_SPECS.map((spec) => ({
                value: spec.value,
                label: spec.label,
              }))}
            />
          </Form.Item>
        </div>
        {gpuSpecs.error || gpuSpecAvailability.error ? (
          <Alert
            type="warning"
            showIcon
            content={getErrorMessage(
              gpuSpecs.error ?? gpuSpecAvailability.error,
              "GPU 规格加载失败，可改用 CPU 规格后重试",
            )}
            className="mb-4"
          />
        ) : selectedGpuSpec ? (
          <Alert
            type="info"
            showIcon
            content={`提交 GPU 型号 ${selectedGpuSpec.gpu_type}，每副本 ${Math.max(
              1,
              selectedGpuAvailability?.gpu_count ?? 1,
            )} 卡${selectedGpuSpec.gpu_mode === "vgpu" ? `，显存 ${selectedGpuSpec.mb_per_share} MiB` : ""}；租户剩余配额 ${gpuSpecAvailability.data?.quota_remaining ?? 0} 卡`}
            className="mb-4"
          />
        ) : null}
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item label="副本" required>
            <InputNumber
              value={replicas}
              onChange={(value) => setReplicas(value ?? 1)}
              min={1}
              precision={0}
              className="w-full"
            />
          </Form.Item>
          <Form.Item label="放置模式">
            <Input value="自动（auto）" readOnly />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
