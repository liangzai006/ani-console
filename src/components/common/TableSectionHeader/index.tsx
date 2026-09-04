import { Typography } from "@arco-design/web-react";
import clsx from "clsx";
import type { ReactNode } from "react";

export function TableSectionHeader({
  title,
  extra,
  className = "mb-3",
}: {
  title: ReactNode;
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex min-w-0 items-center justify-between gap-3",
        className,
      )}
    >
      <Typography.Title heading={6} className="!m-0">
        {title}
      </Typography.Title>
      {extra ? <div className="shrink-0">{extra}</div> : null}
    </div>
  );
}
