import type { ReactNode } from "react";
import {
  IconCloud,
  IconDashboard,
  IconFile,
  IconMessage,
  IconNav,
  IconStorage,
} from "@arco-design/web-react/icon";
import { AliIcon } from "@/components/common";

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
      {
        key: "/overview-compute",
        label: "我的资源概览",
        icon: <IconDashboard />,
      },
      {
        key: "/gpu-inventory",
        label: "GPU 算力管理",
        icon: <AliIcon name="GPU" />,
      },
      {
        key: "compute-instances",
        label: "实例",
        icon: <AliIcon name="yunzhuji" />,
        children: [
          { key: "/vm-instances", label: "云主机 VM" },
          { key: "/container-instances", label: "容器实例" },
          { key: "/gpu-instances", label: "GPU 容器实例" },
          { key: "/sandbox-instances", label: "Sandbox 实例" },
        ],
      },
      {
        key: "compute-clusters",
        label: "集群",
        icon: <AliIcon name="jiqun" />,
        children: [{ key: "/k8s-clusters", label: "K8s 集群" }],
      },
    ],
  },
  {
    key: "network-management",
    label: "网络",
    icon: <IconNav />,
    children: [
      {
        key: "/vpcs",
        label: "VPC",
        icon: <AliIcon name="VPCwangluo" />,
      },
      {
        key: "/subnets",
        label: "子网",
        icon: <AliIcon name="ziwang" />,
      },
      {
        key: "/security-groups",
        label: "安全组",
        icon: <AliIcon name="anquanzu" />,
      },
      {
        key: "/routes",
        label: "路由",
        icon: <AliIcon name="VPCluyouqi" />,
      },
      {
        key: "/load-balancers",
        label: "负载均衡",
        icon: <AliIcon name="fuzaijunhengqi" />,
      },
    ],
  },
  {
    key: "storage",
    label: "存储",
    icon: <IconStorage />,
    children: [
      { key: "/volumes", label: "块存储", icon: <AliIcon name="kuaicunchu" /> },
      {
        key: "/objects",
        label: "对象存储",
        icon: <AliIcon name="duixiangcunchu1" />,
      },
      {
        key: "/filesystems",
        label: "文件存储",
        icon: <AliIcon name="wenjiancunchu" />,
      },
      {
        key: "/vector-stores",
        label: "向量存储",
        icon: <AliIcon name="xiangliangcunchu" />,
      },
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
    children: [{ key: "/kb", label: "知识库管理", icon: <AliIcon name="zhishiku" /> }],
  },
  {
    key: "registry",
    label: "镜像",
    icon: <IconFile />,
    children: [{ key: "/registry", label: "镜像仓库", icon: <AliIcon name="Harbor" /> }],
  },
] as const;

export function isGroupItem(item: MenuItem): item is MenuItem & { children: MenuItem[] } {
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
