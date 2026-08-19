import { Breadcrumb, Button, Form, Space, Tooltip } from '@arco-design/web-react'
import { Link } from '@tanstack/react-router'
import { AliIcon } from '@/components/icons/AliIcon'
import type { FormPageFrameProps } from './types'
import styles from './formbase.module.css'

export function FormPageFrame<FormData extends Record<string, unknown>>({
  breadcrumbs,
  form,
  sections,
  actions,
  onSubmit,
  onBack,
  formProps,
}: FormPageFrameProps<FormData>) {
  const visibleBreadcrumbs = breadcrumbs.filter((item) => item.to !== '/')

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumbRow}>
        <Tooltip content="返回上一级">
          <Button
            type="text"
            shape="circle"
            className={styles.backButton}
            aria-label="返回上一级"
            onClick={onBack ?? (() => window.history.back())}
          >
            <AliIcon name="left-arrow" size={16} />
          </Button>
        </Tooltip>
        <Breadcrumb className={styles.breadcrumbs} aria-label="表单面包屑">
          {visibleBreadcrumbs.map((item, index) => {
            const isLast = index === visibleBreadcrumbs.length - 1
            return (
              <Breadcrumb.Item key={`${index}-${String(item.label)}`}>
                {item.to && !isLast ? (
                  <Link to={item.to as any} params={item.params as any} className={styles.breadcrumbLink}>
                    {item.label}
                  </Link>
                ) : isLast ? (
                  <h1 className={styles.breadcrumbCurrent}>{item.label}</h1>
                ) : (
                  <span className={styles.breadcrumbText}>{item.label}</span>
                )}
              </Breadcrumb.Item>
            )
          })}
        </Breadcrumb>
      </div>

      <section className={styles.surface}>
        <Form<FormData>
          {...formProps}
          form={form}
          className="form-page-form"
          layout={formProps?.layout ?? 'horizontal'}
          scrollToFirstError={formProps?.scrollToFirstError ?? true}
          onSubmit={onSubmit}
        >
          <div className={styles.scrollArea} data-testid="form-page-scroll-area">
            {sections.map((section) => (
              <section key={section.key} className={styles.section} aria-labelledby={`form-section-${section.key}`}>
                <h2 id={`form-section-${section.key}`} className={styles.sectionTitle}>
                  <span className={styles.sectionAccent} aria-hidden="true" />
                  {section.title}
                </h2>
                <div className={styles.sectionContent}>{section.content}</div>
              </section>
            ))}
          </div>
        </Form>

        <footer className={styles.footer} aria-label="表单操作">
          <Space size={12}>
            {actions.map((action) => (
              <Button
                key={action.key}
                {...action.buttonProps}
                onClick={() => {
                  if (action.submit) {
                    form.submit()
                    return
                  }
                  action.onClick?.()
                }}
              >
                {action.label}
              </Button>
            ))}
          </Space>
        </footer>
      </section>
    </div>
  )
}