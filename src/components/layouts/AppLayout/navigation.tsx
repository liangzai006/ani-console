import type { ReactNode } from "react";
import {
  IconApps,
  IconCloud,
  IconCodeSandbox,
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
    key: "products",
    label: "产品与服务",
    icon: <IconApps />,
    children: [
      {
        key: "work-instances",
        label: "工作实例",
        icon: <AliIcon name="yunzhuji" />,
        children: [
          { key: "/vm-instances", label: "云主机", icon: <AliIcon name="yunzhuji" /> },
          {
            key: "/container-instances",
            label: "容器实例",
            icon: <AliIcon name="rongqishili" />,
          },
          { key: "/gpu-instances", label: "GPU 实例", icon: <AliIcon name="GPU" /> },
          {
            key: "/sandbox-instances",
            label: "沙箱实例",
            icon: <IconCodeSandbox />,
          },
        ],
      },
      {
        key: "storage-management",
        label: "存储管理",
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
        key: "network-management",
        label: "网络管理",
        icon: <IconNav />,
        children: [
          { key: "/vpcs", label: "VPC 网络", icon: <AliIcon name="VPCwangluo" /> },
          { key: "/subnets", label: "VPC 子网", icon: <AliIcon name="ziwang" /> },
          {
            key: "/security-groups",
            label: "安全组",
            icon: <AliIcon name="anquanzu" />,
          },
          { key: "/routes", label: "路由", icon: <AliIcon name="VPCluyouqi" /> },
          {
            key: "/load-balancers",
            label: "负载均衡",
            icon: <AliIcon name="fuzaijunhengqi" />,
          },
        ],
      },
      {
        key: "compute-management",
        label: "算力管理",
        icon: <IconCloud />,
        children: [
          {
            key: "/overview-compute",
            label: "资源概览",
            icon: <IconDashboard />,
          },
          {
            key: "/gpu-inventory",
            label: "GPU 算力管理",
            icon: <AliIcon name="GPU" />,
          },
        ],
      },
      {
        key: "cluster-management",
        label: "集群管理",
        icon: <AliIcon name="jiqun" />,
        children: [{ key: "/k8s-clusters", label: "K8s 集群", icon: <AliIcon name="jiqun" /> }],
      },
      {
        key: "ai-services",
        label: "AI 服务",
        icon: <AliIcon name="tuili" />,
        children: [
          { key: "/models", label: "模型仓库", icon: <AliIcon name="moxing" /> },
          { key: "/inference", label: "推理服务", icon: <AliIcon name="tuili" /> },
        ],
      },
      {
        key: "knowledge-services",
        label: "知识服务",
        icon: <IconMessage />,
        children: [{ key: "/kb", label: "知识库管理", icon: <AliIcon name="zhishiku" /> }],
      },
      {
        key: "registry-management",
        label: "镜像管理",
        icon: <IconFile />,
        children: [{ key: "/registry", label: "镜像仓库", icon: <AliIcon name="Harbor" /> }],
      },
    ],
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

/** 根据当前 pathname 计算侧栏 Menu selectedKeys（最长前缀匹配）。 */
export function matchSideMenuKey(pathname: string, routeKeys: string[]): string[] {
  const exact = routeKeys.find((key) => key === pathname);
  if (exact) return [exact];
  const prefix = routeKeys
    .filter((key) => key !== "/" && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  if (prefix) return [prefix];
  const submenu = openSubMenuKeysForPath(pathname)[0];
  return submenu ? [submenu] : ["/"];
}

const PATH_SUBMENU: { prefix: string; key: string }[] = [
  { prefix: "/overview-compute", key: "compute-management" },
  { prefix: "/container-instances", key: "work-instances" },
  { prefix: "/vm-instances", key: "work-instances" },
  { prefix: "/gpu-instances", key: "work-instances" },
  { prefix: "/sandbox-instances", key: "work-instances" },
  { prefix: "/gpu-inventory", key: "compute-management" },
  { prefix: "/k8s-clusters", key: "cluster-management" },
  { prefix: "/volumes", key: "storage-management" },
  { prefix: "/filesystems", key: "storage-management" },
  { prefix: "/objects", key: "storage-management" },
  { prefix: "/vector-stores", key: "storage-management" },
  { prefix: "/models", key: "ai-services" },
  { prefix: "/inference", key: "ai-services" },
  { prefix: "/kb", key: "knowledge-services" },
  { prefix: "/vpcs", key: "network-management" },
  { prefix: "/subnets", key: "network-management" },
  { prefix: "/security-groups", key: "network-management" },
  { prefix: "/routes", key: "network-management" },
  { prefix: "/load-balancers", key: "network-management" },
  { prefix: "/registry", key: "registry-management" },
];

/** 当前路由应展开的侧栏分组 keys。 */
export function openSubMenuKeysForPath(pathname: string): string[] {
  const hit = PATH_SUBMENU.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return hit ? [hit.key] : [];
}

/** 当前路由对应的一级导航 key。 */
export function activeTopNavKeyForPath(pathname: string): string {
  return pathname === "/" ? "/" : "products";
}

/** 一级导航对应的侧栏条目；没有侧栏时返回 null。 */
export function sidebarItemsForTopNavKey(key: string): MenuItem[] | null {
  const item = findMenuItem(key);
  if (!item) return null;
  return isGroupItem(item) ? item.children : null;
}
