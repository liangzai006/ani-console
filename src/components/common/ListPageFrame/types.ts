import type { ReactNode } from "react";
import type { ResourcePageHeaderConfig } from "../ResourcePageFrame";
import type { SearchField } from "../ListToolbar";
import type { ListStatusTab } from "../StatusTabs";

export type ListPageTabsConfig<TStatus extends string> = {
  items: Array<ListStatusTab<TStatus>>;
  value: TStatus;
  onChange: (value: TStatus) => void;
  ariaLabel?: string;
};

export type ListPageSearchConfig<TSearchField extends string> = {
  fields: Array<SearchField<TSearchField>>;
  field: TSearchField;
  value: string;
  placeholder?: string;
  onFieldChange: (field: TSearchField) => void;
  onChange: (value: string) => void;
};

export type ListPageRefreshConfig = {
  onClick: () => void;
  spinning?: boolean;
  disabled?: boolean;
  label?: string;
};

export type ListPageToolbarConfig<TSearchField extends string> = {
  actions?: ReactNode;
  search?: ListPageSearchConfig<TSearchField>;
  filters?: ReactNode;
  refresh?: ListPageRefreshConfig;
  tools?: ReactNode;
};

export type ListPageFrameProps<
  TStatus extends string = string,
  TSearchField extends string = string,
> = {
  header: ResourcePageHeaderConfig;
  tabs?: ListPageTabsConfig<TStatus>;
  toolbar?: ListPageToolbarConfig<TSearchField>;
  children: ReactNode;
};
