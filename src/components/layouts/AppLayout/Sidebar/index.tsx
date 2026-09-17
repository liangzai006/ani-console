import { Link } from "@tanstack/react-router";
import { Empty, Menu, Tooltip } from "@arco-design/web-react";
import clsx from "clsx";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AliIcon } from "@/components/common";
import { isGroupItem, matchSideMenuKey, type MenuItem } from "../navigation";

export const SIDEBAR_WIDTH = 200;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

interface SidebarProps {
  items: MenuItem[] | null;
  label: string;
  activePathname: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

function collectLeafPaths(items: MenuItem[]): string[] {
  const acc: string[] = [];
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      if (isGroupItem(item)) walk(item.children);
      else acc.push(item.key);
    }
  };
  walk(items);
  return acc;
}

function findActiveAncestors(items: MenuItem[], pathname: string): string[] | null {
  for (const item of items) {
    if (item.key === pathname || (item.key.startsWith("/") && pathname.startsWith(`${item.key}/`)))
      return [];
    if (item.children) {
      const sub = findActiveAncestors(item.children, pathname);
      if (sub !== null) return [item.key, ...sub];
    }
  }
  return null;
}

type SidebarRowStyle = CSSProperties & { "--sidebar-row-padding-left": string };

function rowStyle(depth: number): SidebarRowStyle {
  return {
    "--sidebar-row-padding-left": `${depth <= 1 ? 12 : 28 + (depth - 2) * 20}px`,
  };
}

function renderItems(items: MenuItem[], collapsed: boolean, depth = 0) {
  return items.map((item) => {
    const label =
      (depth > 0 || collapsed) && item.icon ? (
        <span className="sidebar-menu-label">
          <span className="sidebar-menu-label-icon">{item.icon}</span>
          <span className="sidebar-menu-label-text">{item.label}</span>
        </span>
      ) : (
        item.label
      );
    if (isGroupItem(item)) {
      const children = renderItems(item.children, collapsed, depth + 1);
      return (
        <Menu.SubMenu
          key={item.key}
          title={label}
          selectable={false}
          className={clsx(
            "sidebar-menu-group",
            depth === 0 ? "sidebar-menu-group--root" : "sidebar-menu-group--nested",
          )}
          style={rowStyle(depth)}
        >
          {collapsed && depth === 0 ? (
            <Menu.ItemGroup
              className="sidebar-menu-popup-group"
              title={<span className="sidebar-menu-popup-title">{item.label}</span>}
            >
              {children}
            </Menu.ItemGroup>
          ) : (
            children
          )}
        </Menu.SubMenu>
      );
    }
    return (
      <Menu.Item
        key={item.key}
        className={clsx("sidebar-menu-leaf", `sidebar-menu-leaf--depth-${depth}`)}
        style={rowStyle(depth)}
        renderItemInTooltip={() => item.label}
      >
        <Link to={item.key} className="block text-inherit no-underline">
          {label}
        </Link>
      </Menu.Item>
    );
  });
}

export function Sidebar({
  items,
  label,
  activePathname,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  const allLeafKeys = useMemo(() => (items ? collectLeafPaths(items) : []), [items]);
  const selectedKeys = useMemo(
    () => matchSideMenuKey(activePathname, allLeafKeys),
    [activePathname, allLeafKeys],
  );
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const menuCollapsed = collapsed && !hoverExpanded;

  useEffect(() => {
    if (!items) return;
    setOpenKeys(items.filter(isGroupItem).map((item) => item.key));
  }, [items]);

  useEffect(() => {
    if (!items) return;
    const ancestors = findActiveAncestors(items, activePathname);
    if (ancestors && ancestors.length) {
      setOpenKeys((prev) => Array.from(new Set([...prev, ...ancestors])));
    }
  }, [activePathname, items]);

  const collapseLabel = collapsed ? "展开侧栏" : "收起侧栏";

  return (
    <aside
      className={clsx("sidebar", collapsed && "is-collapsed", hoverExpanded && "is-hover-expanded")}
      style={{
        width: menuCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        background: "var(--color-bg-2)",
        borderColor: "var(--color-border-2)",
      }}
      onMouseEnter={() => {
        if (collapsed) setHoverExpanded(true);
      }}
      onMouseLeave={() => setHoverExpanded(false)}
    >
      <div className="sidebar-domain">
        <span className="sidebar-domain-icon">
          <AliIcon name="navigation" size={24} />
        </span>
        <span className="sidebar-domain-label">{label}</span>
      </div>
      <div className="sidebar-menu-region">
        {items && items.length > 0 ? (
          <Menu
            id="sidebar-navigation-menu"
            collapse={menuCollapsed}
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            onClickSubMenu={(_key, keys) => setOpenKeys(keys)}
            triggerProps={{
              className: "sidebar-menu-popup-trigger",
              mouseEnterDelay: 50,
              mouseLeaveDelay: 80,
            }}
            tooltipProps={{
              className: "sidebar-menu-leaf-tooltip",
              position: "right",
              triggerProps: { showArrow: false },
            }}
            className={clsx(
              "sidebar-menu",
              "border-none",
              menuCollapsed && "sidebar-menu--collapsed",
            )}
            style={{ background: "transparent" }}
          >
            {renderItems(items, menuCollapsed)}
          </Menu>
        ) : (
          <div className="px-3 py-6">
            <Empty description="暂无子页面" />
          </div>
        )}
      </div>
      <Tooltip content={collapseLabel} position="right" triggerProps={{ showArrow: false }}>
        <button
          type="button"
          className="sidebar-collapse-button"
          aria-label={collapseLabel}
          aria-controls="sidebar-navigation-menu"
          aria-expanded={!collapsed}
          onClick={() => {
            setHoverExpanded(false);
            onCollapsedChange(!collapsed);
          }}
        >
          <AliIcon name={collapsed ? "spread" : "collapse"} size={16} />
        </button>
      </Tooltip>
    </aside>
  );
}
