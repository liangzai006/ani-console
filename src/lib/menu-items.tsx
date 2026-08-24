import type { ReactNode } from "react";
import {
  IconApps,
  IconCloud,
  IconDashboard,
  IconDesktop,
  IconFile,
  IconMessage,
  IconNav,
  IconSafe,
  IconStorage,
  IconUnorderedList,
} from "@arco-design/web-react/icon";
import { AliIcon } from "@/components/icons/AliIcon";

export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  children?: MenuItem[];
}

export const menuItems: readonly MenuItem[] = [
  { key: "/", label: "概览", icon: <IconDashboard /> },
  {
    key: "compute",
    label: "计算",
    icon: <IconCloud />,
    children: [
      { key: "/gpu-inventory", label: "GPU 算力管理", icon: <IconCloud /> },
      {
        key: "compute-instances",
        label: "实例",
        icon: <IconDesktop />,
        children: [
          { key: "/instances/vm", label: "云主机 VM" },
          { key: "/instances/container", label: "容器实例" },
          { key: "/instances/gpu", label: "GPU 容器实例" },
          { key: "/instances/sandbox", label: "Sandbox 实例" },
        ],
      },
      {
        key: "compute-clusters",
        label: "集群",
        icon: <IconApps />,
        children: [{ key: "/k8s-clusters", label: "K8s 集群" }],
      },
    ],
  },
  {
    key: "network-management",
    label: "网络",
    icon: <IconNav />,
    children: [
      { key: "/networks/vpcs", label: "VPC", icon: <IconNav /> },
      { key: "/networks/subnets", label: "子网", icon: <IconNav /> },
      { key: "/networks/security-groups", label: "安全组", icon: <IconSafe /> },
      { key: "/networks/routes", label: "路由", icon: <IconNav /> },
      { key: "/networks/load-balancers", label: "负载均衡", icon: <IconNav /> },
    ],
  },
  {
    key: "storage",
    label: "存储",
    icon: <IconStorage />,
    children: [
      { key: "/volumes", label: "块存储", icon: <IconStorage /> },
      { key: "/objects", label: "对象存储", icon: <IconStorage /> },
      { key: "/filesystems", label: "文件存储", icon: <IconFile /> },
      { key: "/vector-stores", label: "向量存储", icon: <IconUnorderedList /> },
    ],
  },
  {
    key: "ai-services",
    label: "AI 服务",
    icon: <AliIcon name="moxing" />,
    children: [
      {
        key: "ai-models",
        label: "模型",
        icon: <AliIcon name="moxing" />,
        children: [{ key: "/models", label: "模型仓库" }],
      },
      {
        key: "ai-inference",
        label: "推理",
        icon: <AliIcon name="tuili" />,
        children: [{ key: "/inference", label: "推理服务" }],
      },
    ],
  },
  {
    key: "knowledge",
    label: "知识库",
    icon: <IconMessage />,
    children: [{ key: "/kb", label: "知识库管理", icon: <IconMessage /> }],
  },
  {
    key: "registry",
    label: "镜像",
    icon: <IconFile />,
    children: [{ key: "/registry", label: "镜像仓库", icon: <IconFile /> }],
  },
] as const;

export function isGroupItem(
  item: MenuItem,
): item is MenuItem & { children: MenuItem[] } {
  return Array.isArray(item.children) && item.children.length > 0;
}

export function findMenuItem(key: string): MenuItem | undefined {
  return menuItems.find((item) => item.key === key);
}

/** 按菜单展示顺序递归查找第一个可访问的叶子路由。 */
export function firstLeafPath(item: MenuItem): string | null {
  if (!isGroupItem(item)) return item.key.startsWith("/") ? item.key : null;
  for (const child of item.children) {
    const path = firstLeafPath(child);
    if (path) return path;
  }
  return null;
}

export function leafPaths(): string[] {
  const acc: string[] = [];
  const walk = (items: readonly MenuItem[]) => {
    for (const item of items) {
      if (isGroupItem(item)) walk(item.children);
      else if (item.key.startsWith("/")) acc.push(item.key);
    }
  };
  walk(menuItems);
  return acc;
}
