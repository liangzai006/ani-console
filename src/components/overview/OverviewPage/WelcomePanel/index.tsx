import { Dropdown, Empty, Menu } from "@arco-design/web-react";
import { IconDown, IconPlus } from "@arco-design/web-react/icon";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { AliIcon } from "@/components/common";
import type { HomeShortcut } from "../types";
import styles from "../index.module.css";

export function WelcomePanel({ quickCreateItems }: { quickCreateItems: HomeShortcut[] }) {
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
  );

  return (
    <section className={clsx(styles.panel, styles.welcomePanel)} aria-label="用户快捷入口">
      <div className={styles.greetingRow}>
        <div className={styles.avatar}>AI</div>
        <div className={styles.userInfo}>
          <strong>欢迎使用 AI 专有云</strong>
          <span>管理您的计算与 AI 资源</span>
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
        <Empty description="暂无最近访问" />
      </div>
    </section>
  );
}
