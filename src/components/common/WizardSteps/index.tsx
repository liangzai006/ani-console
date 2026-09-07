import { Steps, Typography } from "@arco-design/web-react";
import clsx from "clsx";
import type { ComponentProps } from "react";
import styles from "./index.module.css";

type ArcoStepsProps = ComponentProps<typeof Steps>;

export interface WizardStepsProps extends Omit<ArcoStepsProps, "children"> {
  items: readonly string[];
}

export function WizardSteps({
  items,
  className,
  ...stepsProps
}: WizardStepsProps) {
  return (
    <Steps {...stepsProps} className={clsx(styles.steps, className)}>
      {items.map((title, index) => (
        <Steps.Step
          key={`${index}-${title}`}
          title={
            <Typography.Ellipsis
              className={styles.title}
              expandable={false}
              showTooltip
            >
              {title}
            </Typography.Ellipsis>
          }
        />
      ))}
    </Steps>
  );
}
