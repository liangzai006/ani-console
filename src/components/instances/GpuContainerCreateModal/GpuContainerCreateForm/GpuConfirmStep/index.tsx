import { ImageNameText } from "@/components/common";
import { Descriptions } from "@arco-design/web-react";
import {
  type Filesystem,
  type FormValues,
  type GpuSpecOption,
  type RegistryImage,
  type Volume,
} from "../../types";

export function GpuConfirmStep({
  values,
  image,
  volume,
  filesystem,
  gpuSpec,
  securityGroupName,
}: {
  values: FormValues;
  image?: RegistryImage;
  volume?: Volume;
  filesystem?: Filesystem;
  gpuSpec?: GpuSpecOption;
  securityGroupName: string;
}) {
  return (
    <>
      <Descriptions
        column={1}
        border
        data={[
          { label: "名称", value: values.name || "-" },
          {
            label: "镜像",
            value: image ? <ImageNameText image={image} showSize /> : values.image || "-",
          },
          {
            label: "资源",
            value: `${values.compute_spec} · GPU ${gpuSpec?.display_name ?? values.spec_id} · 副本 ${values.replicas}`,
          },
          {
            label: "网络",
            value: `${values.vpc_id} / ${values.subnet_id} / 默认安全组 ${securityGroupName}`,
          },
          { label: "环境变量", value: values.env_text || "-" },
          {
            label: "块存储",
            value: volume
              ? `${volume.name ?? volume.id} → ${values.volume_mount_path} · ${
                  values.volume_read_only ? "只读" : "读写"
                }`
              : "不挂载块存储",
          },
          {
            label: "文件存储",
            value: filesystem
              ? `${filesystem.name ?? filesystem.id} → ${values.filesystem_mount_path} · ${
                  values.filesystem_read_only ? "只读" : "读写"
                }`
              : "不挂载文件存储",
          },
          { label: "自动启动", value: values.auto_start ? "开" : "关" },
        ]}
      />
    </>
  );
}
