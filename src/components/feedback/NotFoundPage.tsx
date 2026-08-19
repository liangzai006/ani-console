import { Button, Card, Result, Space, Typography } from '@arco-design/web-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { isAuthenticated } from '@/stores/auth'

export function NotFoundPage() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const authenticated = isAuthenticated()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-1)] p-6">
      <Card className="w-full max-w-[560px]">
        <Result
          status="404"
          title="页面不存在"
          subTitle={
            <Space direction="vertical" size={6}>
              <Typography.Text type="secondary">没有找到这个路由。</Typography.Text>
              <Typography.Text code>{pathname}</Typography.Text>
            </Space>
          }
          extra={
            <Space wrap>
              <Button onClick={() => history.back()}>返回上一页</Button>
              <Button type="primary" onClick={() => navigate({ to: authenticated ? '/' : '/login' })}>
                {authenticated ? '回到概览' : '去登录'}
              </Button>
            </Space>
          }
        />
      </Card>
    </div>
  )
}
