import { Dropdown, Menu } from '@arco-design/web-react'
import { IconDown, IconPlus } from '@arco-design/web-react/icon'
import { Link } from '@tanstack/react-router'
import { AliIcon } from '@/components/icons/AliIcon'
import type { HomeOverviewData } from '../types'
import styles from '../home.module.css'

export function WelcomePanel({
  user,
  quickCreateItems,
  recentItems,
}: Pick<HomeOverviewData, 'user' | 'quickCreateItems' | 'recentItems'>) {
  const quickCreateMenu = (
    <Menu className={styles.quickCreateMenu}>
      {quickCreateItems.map((item) => (
        <Menu.Item key={item.id}>
          <Link to={item.route} className={styles.quickCreateLink}>
            <AliIcon name={item.icon} size={16} />
            <span>{item.name}</span>
          </Link>
        </Menu.Item>
      ))}
    </Menu>
  )

  return (
    <section className={`${styles.panel} ${styles.welcomePanel}`} aria-label="用户快捷入口">
      <div className={styles.greetingRow}>
        <div className={styles.avatar}>{user.avatarText}</div>
        <div className={styles.userInfo}>
          <strong>{user.username}</strong>
          <span>{user.greeting}</span>
        </div>
        <Dropdown trigger="click" position="br" droplist={quickCreateMenu}>
          <button type="button" className={styles.quickCreateButton}>
            <IconPlus aria-hidden="true" />
            <span>快捷创建</span>
            <IconDown aria-hidden="true" />
          </button>
        </Dropdown>
      </div>

      <div className={styles.recentDivider}>
        <span />
        <em>最近访问</em>
        <span />
      </div>

      <div className={styles.recentGrid}>
        {recentItems.map((item) => (
          <Link key={item.id} to={item.route} className={styles.recentItem}>
            <AliIcon name={item.icon} size={20} />
            <span>{item.name}</span>
          </Link>
        ))}
        <span className={styles.recentPlaceholder} aria-hidden="true" />
      </div>
    </section>
  )
}
