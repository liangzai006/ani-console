import { findMenuItem, isGroupItem, menuItems } from "./menu-items";

/** 根据当前 pathname 计算侧栏 Menu selectedKeys（最长前缀匹配）。 */
export function matchSideMenuKey(
  pathname: string,
  routeKeys: string[],
): string[] {
  const exact = routeKeys.find((k) => k === pathname);
  if (exact) return [exact];
  const prefix = routeKeys
    .filter((k) => k !== "/" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  if (prefix) return [prefix];
  const submenu = openSubMenuKeysForPath(pathname)[0];
  return submenu ? [submenu] : ["/"];
}

const PATH_SUBMENU: { prefix: string; key: string }[] = [
  { prefix: "/overview-compute", key: "compute" },
  { prefix: "/compute-instances", key: "compute" },
  { prefix: "/container-instances", key: "compute" },
  { prefix: "/vm-instances", key: "compute" },
  { prefix: "/gpu-instances", key: "compute" },
  { prefix: "/sandbox-instances", key: "compute" },
  { prefix: "/gpu-inventory", key: "compute" },
  { prefix: "/sandbox-templates", key: "compute" },
  { prefix: "/k8s-clusters", key: "compute" },
  { prefix: "/images", key: "registry" },
  { prefix: "/volumes", key: "storage" },
  { prefix: "/filesystems", key: "storage" },
  { prefix: "/objects", key: "storage" },
  { prefix: "/vector-stores", key: "storage" },
  { prefix: "/models", key: "ai-services" },
  { prefix: "/inference", key: "ai-services" },
  { prefix: "/kb", key: "knowledge" },
  { prefix: "/vpcs", key: "network-management" },
  { prefix: "/subnets", key: "network-management" },
  { prefix: "/security-groups", key: "network-management" },
  { prefix: "/routes", key: "network-management" },
  { prefix: "/load-balancers", key: "network-management" },
  { prefix: "/registry", key: "registry" },
];

/** 当前路由应展开的 SubMenu keys（页面模板 2.0 §3 侧栏分组）。 */
export function openSubMenuKeysForPath(pathname: string): string[] {
  const hit = PATH_SUBMENU.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return hit ? [hit.key] : [];
}

/** 当前路由对应的一级菜单 key（叶子项返回 path，分组项返回 group key）。 */
export function activeTopNavKeyForPath(pathname: string): string {
  return openSubMenuKeysForPath(pathname)[0] ?? "/";
}

/** 该一级菜单的子项列表；无子项返回 null。 */
export function sidebarItemsForTopNavKey(key: string) {
  const item = findMenuItem(key);
  if (!item) return null;
  return isGroupItem(item) ? item.children : null;
}

export { menuItems };
