import type { ReactNode } from "react";

export type DetailBreadcrumbItem = {
  label: ReactNode;
  to?: string;
  params?: Record<string, string>;
};

export type DetailSummaryItem = {
  label: string;
  value: string;
};

export type DetailHeaderItems = DetailSummaryItem[];

export type DetailField = {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
};

export type DetailCard = {
  key: string;
  title: ReactNode;
  fields: DetailField[];
  defaultCollapsed?: boolean;
};

export type DetailTab = {
  key: string;
  label: ReactNode;
  content: ReactNode;
  extra?: ReactNode;
};
