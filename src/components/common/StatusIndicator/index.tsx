import { Tag } from "@arco-design/web-react";
import { IconLoading } from "@arco-design/web-react/icon";
import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./index.module.css";

export type StatusIndicatorTone = "primary" | "success" | "warning" | "danger" | "neutral";

export interface StatusIndicatorProps {
  children: ReactNode;
  tone?: StatusIndicatorTone;
  loading?: boolean;
  className?: string;
}

const TONE_COLOR: Record<StatusIndicatorTone, "arcoblue" | "green" | "orange" | "red" | "gray"> = {
  primary: "arcoblue",
  success: "green",
  warning: "orange",
  danger: "red",
  neutral: "gray",
};

export function StatusIndicator({
  children,
  tone = "neutral",
  loading = false,
  className,
}: StatusIndicatorProps) {
  const indicatorIcon = loading ? (
    <IconLoading className={styles.loadingIcon} aria-hidden="true" />
  ) : (
    <span className={styles.dot} aria-hidden="true" />
  );

  return (
    <Tag
      color={TONE_COLOR[tone]}
      bordered={false}
      className={clsx(styles.indicator, className)}
      icon={indicatorIcon}
      aria-busy={loading || undefined}
    >
      {children}
    </Tag>
  );
}
