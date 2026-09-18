import { Skeleton } from "@arco-design/web-react";
import styles from "./index.module.css";

type DetailPagePlaceholderProps = {
  loading: boolean;
};

const headerItemWidths = [152, 136, 168];
const tabWidths = [64, 72, 56, 80, 64];

export function DetailPagePlaceholder({ loading }: DetailPagePlaceholderProps) {
  return (
    <div
      className={styles.page}
      role="status"
      aria-busy={loading}
      aria-label={loading ? "正在加载详情" : "暂无详情数据"}
    >
      <div className={styles.breadcrumbRow}>
        <Skeleton loading animation={loading} text={{ rows: 1, width: 280 }} />
      </div>

      <section className={styles.headerCard}>
        <div className={styles.identity}>
          <Skeleton
            loading
            animation={loading}
            image={{ shape: "square", style: { width: 32, height: 32 } }}
            text={{ rows: 1, width: 152 }}
          />
        </div>
        <div className={styles.headerItems}>
          {headerItemWidths.map((width) => (
            <div key={width} className={styles.headerItem}>
              <Skeleton loading animation={loading} text={{ rows: 1, width }} />
            </div>
          ))}
        </div>
        <div className={styles.headerActions}>
          <Skeleton loading animation={loading} text={{ rows: 1, width: 128 }} />
        </div>
      </section>

      <div className={styles.workspace}>
        <aside className={styles.leftPane}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <Skeleton loading animation={loading} text={{ rows: 1, width: 96 }} />
            </div>
            <div className={styles.cardBody}>
              <Skeleton
                loading
                animation={loading}
                text={{
                  rows: 8,
                  width: ["100%", "82%", "94%", "76%", "88%", "80%", "92%", "72%"],
                }}
              />
            </div>
          </section>
        </aside>

        <section className={styles.rightPane}>
          <div className={styles.tabsHeader}>
            {tabWidths.map((width, index) => (
              <div key={`${index}-${width}`} className={styles.tab}>
                <Skeleton loading animation={loading} text={{ rows: 1, width }} />
              </div>
            ))}
          </div>
          <div className={styles.tabContent}>
            <Skeleton
              loading
              animation={loading}
              text={{ rows: 6, width: ["28%", "72%", "66%", "84%", "76%", "56%"] }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
