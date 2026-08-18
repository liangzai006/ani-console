import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button, Card, Grid, Modal, Space, Typography } from '@arco-design/web-react'
import { PageHeader } from '@/components/shell/AppShell'
import { useAuthStore } from '@/stores/auth'
import { useBrandingStore } from '@/stores/branding'
import { useMutation } from '@tanstack/react-query'
import { coreApi } from '@/api/client'
import { newIdempotencyKey } from '@/lib/idempotency'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const branding = useBrandingStore((s) => s.branding)
  const clear = useAuthStore((s) => s.clear)
  const navigate = useNavigate()

  const logout = useMutation({
    mutationFn: async () => {
      const jti = useAuthStore.getState().getAccessTokenJti()
      if (!jti) throw new Error('当前 access token 缺少 jti，无法调用服务端登出')
      await coreApi.POST('/auth/logout', { body: { jti, idempotency_key: newIdempotencyKey() } })
    },
    onSettled: () => {
      clear()
      navigate({ to: '/login' })
    },
  })

  const confirmLogout = () => {
    Modal.confirm({
      title: '确认退出登录',
      content: '退出后需重新登录。',
      okButtonProps: { status: 'danger' },
      onOk: () => logout.mutateAsync(),
    })
  }

  return (
    <>
      <PageHeader title="设置" subtitle="账户与平台配置" />
      <Grid.Row gutter={16}>
        <Grid.Col xs={24} md={12}>
          <Card title="平台信息" className="h-full">
            <Space direction="vertical" className="w-full">
              <Typography.Text>平台名称：{branding?.platform_name ?? 'ANI Console'}</Typography.Text>
              {branding?.icp_number ? (
                <Typography.Text type="secondary">ICP：{branding.icp_number}</Typography.Text>
              ) : null}
            </Space>
          </Card>
        </Grid.Col>
        <Grid.Col xs={24} md={12}>
          <Card title="账户" className="h-full">
            <Space direction="vertical" className="w-full">
              <Button type="outline" onClick={() => navigate({ to: '/settings/api-keys' })}>
                管理 API Key
              </Button>
              <Button status="danger" loading={logout.isPending} onClick={confirmLogout}>
                退出登录
              </Button>
            </Space>
          </Card>
        </Grid.Col>
      </Grid.Row>
    </>
  )
}
