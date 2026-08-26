import type { CSSProperties, HTMLAttributes } from 'react'

export interface AliIconProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  name: string
  size?: CSSProperties['fontSize']
  color?: CSSProperties['color']
}

export function AliIcon({
  name,
  size,
  color,
  className = '',
  style,
  ...props
}: AliIconProps) {
  const iconClassName = name.startsWith('icon-') ? name : `icon-${name}`
  const hasAccessibleName = Boolean(
    props['aria-label'] || props['aria-labelledby'] || props.title,
  )

  return (
    <i
      {...props}
      aria-hidden={props['aria-hidden'] ?? (hasAccessibleName ? undefined : true)}
      className={`iconfont ${iconClassName} ali-icon ${className}`.trim()}
      data-icon-name={name}
      style={{ fontSize: size, color, ...style }}
    />
  )
}
