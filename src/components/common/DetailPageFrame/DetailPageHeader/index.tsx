import type { ReactNode } from "react";
import styles from "./index.module.css";
import type { DetailHeaderItems } from "../types";

type DetailPageHeaderProps = {
  title: ReactNode;
  status?: ReactNode;
  icon?: ReactNode;
  items: DetailHeaderItems;
  actions?: ReactNode;
};

export function DetailPageHeader({ title, status, icon, items, actions }: DetailPageHeaderProps) {
  return (
    <section className={styles.headerCard}>
      <div className={styles.identity}>
        {icon ? <div className={styles.identityIcon}>{icon}</div> : null}
        <div className={styles.identityText}>
          <h1 className={styles.title}>{title}</h1>
          {status ? <div className={styles.status}>{status}</div> : null}
        </div>
      </div>

      <div className={styles.headerItems} aria-label="关键字段">
        {items.map((item, index) => (
          <div key={`${index}-${String(item.label)}`} className={styles.headerItem}>
            <span className={styles.headerItemLabel}>{item.label}</span>
            <span className={styles.headerItemValue}>{item.value}</span>
          </div>
        ))}
      </div>

      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </section>
  );
}
