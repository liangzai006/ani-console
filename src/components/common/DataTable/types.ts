export type RowActionIntent = "default" | "danger" | "warning" | "success";

type ActionValue<T, V> = V | ((record: T) => V);

type StaticActionLabel = {
  label: string;
  widthLabel?: never;
};

type DynamicActionLabel<T> = {
  label: (record: T) => string;
  widthLabel: string;
};

type RowActionBase<T> = {
  key: string;
  intent?: RowActionIntent;
  visible?: (record: T) => boolean;
  disabled?: (record: T) => boolean;
  loading?: (record: T) => boolean;
  tooltip?: ActionValue<T, string | undefined>;
  onClick: (record: T) => void | Promise<unknown>;
};

export type RowAction<T> = RowActionBase<T> & (StaticActionLabel | DynamicActionLabel<T>);
