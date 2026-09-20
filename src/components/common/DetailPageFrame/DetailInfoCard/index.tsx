import clsx from "clsx";
import { AliIcon } from "../../AliIcon";
import styles from "./index.module.css";
import type { DetailCard } from "../types";

type DetailInfoCardProps = {
  card: DetailCard;
  collapsed: boolean;
  fill: boolean;
  onToggle: () => void;
};

export function DetailInfoCard({ card, collapsed, fill, onToggle }: DetailInfoCardProps) {
  const bodyId = `detail-card-${card.key}`;

  return (
    <section className={clsx(styles.card, fill && styles.cardFill)}>
      <button
        type="button"
        className={styles.cardHeader}
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        aria-label={`${collapsed ? "展开" : "折叠"}${String(card.title)}`}
        onClick={onToggle}
      >
        <span className={styles.cardAccent} />
        <AliIcon
          name="down-chevron-small"
          size={14}
          className={collapsed ? styles.cardChevronCollapsed : styles.cardChevron}
        />
        <span className={styles.cardTitle}>{card.title}</span>
      </button>
      {!collapsed ? (
        <div id={bodyId} className={styles.cardBody}>
          {card.fields.map((field, index) => (
            <div key={`${card.key}-${index}`} className={styles.fieldRow}>
              <div className={styles.fieldLabel}>{field.label}</div>
              <div className={clsx(styles.fieldValue, field.valueClassName)}>
                {field.value ?? "-"}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
