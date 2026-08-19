import type { ReactNode } from 'react'
import {
  IconApps,
  IconCloud,
  IconDashboard,
  IconDesktop,
  IconExperiment,
  IconFile,
  IconLock,
  IconMessage,
  IconNav,
  IconSafe,
  IconSettings,
  IconStorage,
  IconUnorderedList,
} from '@arco-design/web-react/icon'
import { AliIcon } from '@/components/icons/AliIcon'

export interface MenuItem {
  key: string
  label: string
  icon?: ReactNode
  children?: MenuItem[]
}

export const menuItems: readonly MenuItem[] = [
  { key: '/', label: '概览', icon: <IconDashboard /> },
  {
    key: 'compute',
    label: '算力与实例',
    icon: <IconCloud />,
    children: [
      { key: '/gpu-inventory', label: 'GPU 算力管理', icon: <IconCloud /> },
      {
        key: 'compute-instances',
        label: '实例',
        icon: <IconDesktop />,
        children: [
          { key: '/instances/vm', label: '云主机 VM' },
          { key: '/instances/container', label: '容器实例' },
          { key: '/instances/gpu', label: 'GPU 容器实例' },
          { key: '/instances/sandbox', label: 'Sandbox 实例' },
        ],
      },
      {
        key: 'compute-clusters',
        label: '集群',
        icon: <IconApps />,
        children: [
          { key: '/k8s-clusters', label: 'K8s 集群' },
        ],
      },
    ],
  },
  {
    key: 'storage',
    label: '存储',
    icon: <IconStorage />,
    children: [
      { key: '/volumes', label: '块存储卷', icon: <IconStorage /> },
      { key: '/filesystems', label: '文件存储', icon: <IconFile /> },
      { key: '/objects', label: '对象存储', icon: <IconStorage /> },
      { key: '/vector-stores', label: '向量存储', icon: <IconUnorderedList /> },
    ],
  },
  {
    key: 'network-management',
    label: '网络管理',
    icon: <IconNav />,
    children: [
      { key: '/networks/vpcs', label: 'VPC', icon: <IconNav /> },
      { key: '/networks/subnets', label: '子网', icon: <IconNav /> },
      { key: '/networks/security-groups', label: '安全组', icon: <IconSafe /> },
      { key: '/networks/load-balancers', label: '负载均衡', icon: <IconNav /> },
      { key: '/networks/routes', label: '路由', icon: <IconNav /> },
    ],
  },
  {
    key: 'registry',
    label: '镜像与 Registry',
    icon: <IconFile />,
    children: [
      { key: '/images', label: '可启动镜像', icon: <IconFile /> },
      { key: '/registry', label: '镜像 Registry', icon: <IconFile /> },
    ],
  },
  {
    key: 'security',
    label: '安全',
    icon: <IconLock />,
    children: [
      { key: '/encryption', label: '加密密钥', icon: <IconLock /> },
      { key: '/secrets', label: '密钥管理', icon: <IconSafe /> },
    ],
  },
  {
    key: 'observability',
    label: '监控与告警',
    icon: <IconExperiment />,
    children: [
      { key: '/observability', label: '监控与告警', icon: <IconExperiment /> },
    ],
  },
  {
    key: 'usage',
    label: '用量与账单',
    icon: <IconNav />,
    children: [
      { key: '/usage', label: '用量', icon: <IconNav /> },
    ],
  },
  {
    key: 'settings',
    label: '设置',
    icon: <IconSettings />,
    children: [
      { key: '/settings', label: '通用设置', icon: <IconSettings /> },
      { key: '/settings/api-keys', label: 'API Key', icon: <IconSafe /> },
    ],
  },
  {
    key: 'reserved',
    label: '预留',
    icon: <IconSafe />,
    children: [
      { key: '/bare-metal', label: '裸金属', icon: <IconDesktop /> },
      { key: '/notifications', label: '通知', icon: <IconMessage /> },
      { key: '/audit', label: '审计', icon: <IconFile /> },
    ],
  },
  {
    key: 'demo',
    label: '演示菜单',
    icon: <AliIcon name="caidanguanli" />,
    children: [
      { key: '/demo/leaf', label: '独立叶子页', icon: <AliIcon name="file" /> },
      {
        key: 'demo-group-a',
        label: '分组 A',
        icon: <AliIcon name="caidanguanli" />,
        children: [
          { key: '/demo/a-1', label: '页面 A-1' },
          { key: '/demo/a-2', label: '页面 A-2' },
          {
            key: 'demo-group-b',
            label: '分组 B',
            icon: <AliIcon name="caidanguanli" />,
            children: [
              { key: '/demo/b-1', label: '页面 B-1' },
              {
                key: 'demo-group-b-i',
                label: '子分组 B-i',
                children: [
                  { key: '/demo/b-i-1', label: '页面 B-i-1' },
                  { key: '/demo/b-i-2', label: '页面 B-i-2' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
] as const

export function isGroupItem(item: MenuItem): item is MenuItem & { children: MenuItem[] } {
  return Array.isArray(item.children) && item.children.length > 0
}

export function findMenuItem(key: string): MenuItem | undefined {
  return menuItems.find((item) => item.key === key)
}

/** 按菜单展示顺序递归查找第一个可访问的叶子路由。 */
export function firstLeafPath(item: MenuItem): string | null {
  if (!isGroupItem(item)) return item.key.startsWith('/') ? item.key : null
  for (const child of item.children) {
    const path = firstLeafPath(child)
    if (path) return path
  }
  return null
}

export function leafPaths(): string[] {
  const acc: string[] = []
  const walk = (items: readonly MenuItem[]) => {
    for (const item of items) {
      if (isGroupItem(item)) walk(item.children)
      else if (item.key.startsWith('/')) acc.push(item.key)
    }
  }
  walk(menuItems)
  return acc
}
