import { Link } from '@tanstack/react-router'
import { Empty, Menu, Tooltip } from '@arco-design/web-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AliIcon } from '@/components/icons/AliIcon'
import { matchSideMenuKey } from '@/lib/side-menu-match'
import { isGroupItem, type MenuItem } from '@/lib/menu-items'

export const SIDEBAR_WIDTH = 184
export const SIDEBAR_COLLAPSED_WIDTH = 56

interface SidebarProps {
  items: MenuItem[] | null
  activePathname: string
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

function collectLeafPaths(items: MenuItem[]): string[] {
  const acc: string[] = []
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      if (isGroupItem(item)) walk(item.children)
      else acc.push(item.key)
    }
  }
  walk(items)
  return acc
}

function findActiveAncestors(items: MenuItem[], pathname: string): string[] | null {
  for (const item of items) {
    if (
      item.key === pathname
      || (item.key.startsWith('/') && pathname.startsWith(`${item.key}/`))
    ) return []
    if (item.children) {
      const sub = findActiveAncestors(item.children, pathname)
      if (sub !== null) return [item.key, ...sub]
    }
  }
  return null
}

type SidebarRowStyle = CSSProperties & { '--sidebar-row-padding-left': string }

function rowStyle(depth: number): SidebarRowStyle {
  return {
    '--sidebar-row-padding-left': `${depth === 0 ? 12 : 20 + depth * 20}px`,
  }
}

function renderItems(items: MenuItem[], collapsed: boolean, depth = 0) {
  return items.map((item) => {
    const label = depth === 0 && item.icon ? (
      <span className="sidebar-menu-label">
        <span className="sidebar-menu-label-icon">{item.icon}</span>
        <span className="sidebar-menu-label-text">{item.label}</span>
      </span>
    ) : (
      item.label
    )
    if (isGroupItem(item)) {
      const children = renderItems(item.children, collapsed, depth + 1)
      return (
        <Menu.SubMenu
          key={item.key}
          title={label}
          selectable={false}
          className="sidebar-menu-group"
          data-menu-key={item.key}
          style={rowStyle(depth)}
        >
          {collapsed && depth === 0 ? (
            <Menu.ItemGroup
              className="sidebar-menu-popup-group"
              title={<span className="sidebar-menu-popup-title">{item.label}</span>}
            >
              {children}
            </Menu.ItemGroup>
          ) : children}
        </Menu.SubMenu>
      )
    }
    return (
      <Menu.Item
        key={item.key}
        className="sidebar-menu-leaf"
        data-menu-key={item.key}
        style={rowStyle(depth)}
        renderItemInTooltip={() => item.label}
      >
        <Link to={item.key} className="block text-inherit no-underline">
          {label}
        </Link>
      </Menu.Item>
    )
  })
}

export function Sidebar({
  items,
  activePathname,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  const allLeafKeys = useMemo(() => (items ? collectLeafPaths(items) : []), [items])
  const selectedKeys = useMemo(
    () => matchSideMenuKey(activePathname, allLeafKeys),
    [activePathname, allLeafKeys],
  )
  const [openKeys, setOpenKeys] = useState<string[]>([])

  useEffect(() => {
    if (!items) return
    const ancestors = findActiveAncestors(items, activePathname)
    if (ancestors && ancestors.length) {
      setOpenKeys((prev) => Array.from(new Set([...prev, ...ancestors])))
    }
  }, [activePathname, items])

  const collapseLabel = collapsed ? '展开侧栏' : '收起侧栏'

  return (
    <aside
      data-component="sidebar"
      data-collapsed={collapsed ? 'true' : 'false'}
      className="sidebar-shell"
      style={{
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        background: 'var(--color-bg-2)',
        borderColor: 'var(--color-border-2)',
      }}
    >
      <div className="sidebar-menu-region" data-component="sidebar-scroll-region">
        {items && items.length > 0 ? (
          <Menu
            id="sidebar-navigation-menu"
            collapse={collapsed}
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            onClickSubMenu={(_key, keys) => setOpenKeys(keys)}
            triggerProps={{
              className: 'sidebar-menu-popup-trigger',
              mouseEnterDelay: 50,
              mouseLeaveDelay: 80,
            }}
            tooltipProps={{
              className: 'sidebar-menu-leaf-tooltip',
              position: 'right',
              triggerProps: { showArrow: false },
            }}
            className={`sidebar-menu border-none${collapsed ? ' sidebar-menu--collapsed' : ''}`}
            style={{ background: 'transparent' }}
          >
            {renderItems(items, collapsed)}
          </Menu>
        ) : (
          <div className="px-3 py-6">
            <Empty description="暂无子页面" />
          </div>
        )}
      </div>
      <Tooltip
        content={collapseLabel}
        position="right"
        triggerProps={{ showArrow: false }}
      >
        <button
          type="button"
          className="sidebar-collapse-button"
          aria-label={collapseLabel}
          aria-controls="sidebar-navigation-menu"
          aria-expanded={!collapsed}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <AliIcon name={collapsed ? 'spread' : 'collapse'} size={16} />
        </button>
      </Tooltip>
    </aside>
  )
}
