import { Breadcrumb, Button, Tooltip } from "@arco-design/web-react";
import { Link, useRouter } from "@tanstack/react-router";
import { AliIcon } from "../../AliIcon";
import styles from "./index.module.css";
import type { DetailBreadcrumbItem } from "../types";

type DetailBreadcrumbsProps = {
  items: DetailBreadcrumbItem[];
  onBack?: () => void;
};

export function DetailBreadcrumbs({ items, onBack }: DetailBreadcrumbsProps) {
  const router = useRouter();
  const visibleItems = items.filter((item) => item.to !== "/");

  return (
    <div className={styles.breadcrumbRow}>
      <Tooltip content="返回上一级">
        <Button
          type="text"
          shape="circle"
          className={styles.backButton}
          aria-label="返回上一级"
          onClick={onBack ?? (() => router.history.back())}
        >
          <AliIcon name="left-arrow" size={16} />
        </Button>
      </Tooltip>
      <Breadcrumb className={styles.breadcrumbs} aria-label="详情面包屑">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          return (
            <Breadcrumb.Item key={`${index}-${String(item.label)}`}>
              {item.to && !isLast ? (
                <Link
                  to={item.to as any}
                  params={item.params as any}
                  className={styles.breadcrumbLink}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? styles.breadcrumbCurrent : styles.breadcrumbText}>
                  {item.label}
                </span>
              )}
            </Breadcrumb.Item>
          );
        })}
      </Breadcrumb>
    </div>
  );
}
