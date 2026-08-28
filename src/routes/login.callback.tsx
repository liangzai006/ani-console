import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button, Card, Result, Spin, Typography } from '@arco-design/web-react'
import { useEffect, useState } from 'react'
import { AuthCenterLayout } from '@/components/shell/AuthCenterLayout'
import { ApiErrorAlert } from '@/components/common'
import { exchangeOidcCode } from '@/lib/oidc-exchange'
import { parseApiError } from '@/lib/errors'
import { isAuthenticated, useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/login/callback')({
  component: LoginCallbackPage,
})

type CallbackPhase = 'loading' | 'missing' | 'error'

const PENDING_KEY = 'ani-console-oidc-pending'
const exchangeDoneKey = (code: string, state: string) => `ani-console-oidc:${code}:${state}`

function stripCallbackQuery() {
  window.history.replaceState({}, '', '/login/callback')
}

function readCallbackParams(): { code: string | null; state: string | null } {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  if (code && state) {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ code, state }))
    stripCallbackQuery()
    return { code, state }
  }

  const raw = sessionStorage.getItem(PENDING_KEY)
  if (!raw) return { code: null, state: null }
  try {
    const parsed = JSON.parse(raw) as { code?: string; state?: string }
    if (parsed.code && parsed.state) return { code: parsed.code, state: parsed.state }
  } catch {
    sessionStorage.removeItem(PENDING_KEY)
  }
  return { code: null, state: null }
}

function LoginCallbackPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((s) => s.setTokens)
  const [phase, setPhase] = useState<CallbackPhase>('loading')
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI || `${window.location.origin}/login/callback`
    const { code, state } = readCallbackParams()

    if (!code || !state) {
      if (isAuthenticated()) {
        navigate({ to: '/', replace: true })
        return
      }
      setPhase('missing')
      return
    }

    if (sessionStorage.getItem(exchangeDoneKey(code, state)) === '1' && isAuthenticated()) {
      sessionStorage.removeItem(PENDING_KEY)
      navigate({ to: '/', replace: true })
      return
    }

    exchangeOidcCode(code, state, redirectUri)
      .then((tokens) => {
        setTokens(tokens)
        sessionStorage.setItem(exchangeDoneKey(code, state), '1')
        sessionStorage.removeItem(PENDING_KEY)
        stripCallbackQuery()
        navigate({ to: '/', replace: true })
      })
      .catch((e) => {
        sessionStorage.removeItem(PENDING_KEY)
        sessionStorage.removeItem(exchangeDoneKey(code, state))
        setError(e)
        setPhase('error')
      })
  }, [navigate, setTokens])

  if (phase === 'missing') {
    return (
      <AuthCenterLayout>
        <Card className="w-full max-w-[400px]">
          <Result
            status="warning"
            title="缺少授权参数"
            subTitle="请从登录页重新发起 OIDC 授权"
            extra={
              <Link to="/login">
                <Button type="primary">返回登录</Button>
              </Link>
            }
          />
        </Card>
      </AuthCenterLayout>
    )
  }

  if (phase === 'error') {
    const parsed = parseApiError(error)
    const detail =
      parsed.code === 'UNAUTHORIZED'
        ? 'Gateway 无法用此 code 完成 Dex 换票（常见于 code 已用过、state 过期或 Dex 不可达）。请返回登录页重新发起一次完整登录。'
        : undefined

    return (
      <AuthCenterLayout>
        <Card className="w-full max-w-[480px] space-y-4">
          <ApiErrorAlert error={error} title="登录失败" />
          {detail ? <Typography.Paragraph type="secondary">{detail}</Typography.Paragraph> : null}
          {parsed.request_id ? (
            <Typography.Text type="secondary" className="text-xs">
              request_id: {parsed.request_id}
            </Typography.Text>
          ) : null}
          <Link to="/login">
            <Button type="primary">返回登录</Button>
          </Link>
        </Card>
      </AuthCenterLayout>
    )
  }

  return (
    <AuthCenterLayout>
      <Card className="w-full max-w-[360px] text-center">
        <Spin className="block" />
        <Typography.Text className="mt-4 block">正在完成登录…</Typography.Text>
      </Card>
    </AuthCenterLayout>
  )
}
