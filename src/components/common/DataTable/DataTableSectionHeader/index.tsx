import { Typography } from "@arco-design/web-react";
import clsx from "clsx";
import type { ReactNode } from "react";

export type DataTableSectionHeaderProps = {
  title: ReactNode;
  extra?: ReactNode;
  className?: string;
};

export function DataTableSectionHeader({
  title,
  extra,
  className = "mb-3",
}: DataTableSectionHeaderProps) {
  return (
    <div className={clsx("flex min-w-0 items-center justify-between gap-3", className)}>
      <Typography.Title heading={6} className="m-0!">
        {title}
      </Typography.Title>
      {extra ? <div className="shrink-0">{extra}</div> : null}
    </div>
  );
}
