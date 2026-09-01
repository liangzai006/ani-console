import { useEffect, useRef, useState } from 'react'
import RFB from '@novnc/novnc'
import { Alert, Button, Radio, Spin, Tag } from '@arco-design/web-react'
import clsx from 'clsx'
import { coreApi } from '@/api/client'
import { getErrorMessage } from '@/lib/errors'
import { newIdempotencyKey } from '@/lib/idempotency'

type ConsoleStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'expired'
type ViewMode = 'fit' | 'native'

const STATUS_META: Record<ConsoleStatus, { text: string; color: string }> = {
  connecting: { text: '连接中', color: 'blue' },
  connected: { text: '已连接', color: 'green' },
  disconnected: { text: '已断开', color: 'gray' },
  error: { text: '连接异常', color: 'red' },
  expired: { text: '会话过期', color: 'orangered' },
}

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false
  const ms = Date.parse(expiresAt)
  return Number.isFinite(ms) && Date.now() >= ms
}

function applyViewMode(rfb: RFB, mode: ViewMode) {
  const fit = mode === 'fit'
  rfb.scaleViewport = fit
  rfb.resizeSession = fit
  rfb.clipViewport = !fit
  rfb.dragViewport = !fit
  rfb.focusOnClick = true
}

export function InstanceVncConsole({
  instanceId,
  protocol = 'novnc',
}: {
  instanceId: string
  protocol?: 'vnc' | 'novnc'
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const rfbRef = useRef<RFB | null>(null)
  const expiresAtRef = useRef<string | null>(null)
  const viewModeRef = useRef<ViewMode>('fit')
  const [status, setStatus] = useState<ConsoleStatus>('connecting')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [reconnectKey, setReconnectKey] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('fit')

  useEffect(() => {
    viewModeRef.current = viewMode
    const rfb = rfbRef.current
    if (rfb) applyViewMode(rfb, viewMode)
  }, [viewMode])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let rfb: RFB | null = null
    expiresAtRef.current = null

    const connect = async () => {
      setStatus('connecting')
      setErrorText(null)
      try {
        const { data, error } = await coreApi.POST('/instances/{instance_id}/console', {
          params: { path: { instance_id: instanceId } },
          body: { protocol, idempotency_key: newIdempotencyKey() },
        })
        if (error) throw error
        const url = data?.connect_url || data?.url
        if (!url) throw new Error('控制台连接地址为空')
        expiresAtRef.current = data?.expires_at ?? null
        if (isExpired(data?.expires_at)) {
          throw new Error('控制台会话已过期，请重新申请')
        }
        if (disposed) return

        rfb = new RFB(host, url)
        applyViewMode(rfb, viewModeRef.current)
        rfb.background = '#0b0e16'
        rfb.addEventListener('connect', () => {
          if (!disposed) setStatus('connected')
        })
        rfb.addEventListener('disconnect', () => {
          if (disposed) return
          if (isExpired(expiresAtRef.current)) {
            setStatus('expired')
            setErrorText('控制台会话已过期，请重新申请')
            return
          }
          setStatus('disconnected')
        })
        rfb.addEventListener('securityfailure', (event) => {
          if (disposed) return
          setStatus('error')
          const detail = event instanceof CustomEvent ? event.detail : undefined
          setErrorText(typeof detail?.reason === 'string' ? detail.reason : 'VNC 安全握手失败')
        })
        rfbRef.current = rfb
      } catch (e) {
        if (disposed) return
        const message = getErrorMessage(e, '控制台连接失败')
        if (message.includes('过期')) {
          setStatus('expired')
        } else {
          setStatus('error')
        }
        setErrorText(message)
      }
    }

    void connect()

    return () => {
      disposed = true
      rfbRef.current = null
      rfb?.disconnect()
    }
  }, [instanceId, protocol, reconnectKey])

  const meta = STATUS_META[status]
  const canReconnect = status === 'error' || status === 'disconnected' || status === 'expired'

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0b0e16] text-white">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 px-3">
        <div className="truncate text-sm text-gray-300">VNC 控制台</div>
        <div className="flex items-center gap-2">
          <Radio.Group
            type="button"
            size="mini"
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
          >
            <Radio value="fit">适配窗口</Radio>
            <Radio value="native">原始尺寸</Radio>
          </Radio.Group>
          <Tag color={meta.color}>{meta.text}</Tag>
          {canReconnect ? (
            <Button
              size="mini"
              type="primary"
              onClick={() => setReconnectKey((value) => value + 1)}
            >
              重新连接
            </Button>
          ) : null}
        </div>
      </div>
      {errorText ? (
        <div className="p-3">
          <Alert type="error" content={errorText} />
        </div>
      ) : null}
      <div
        className={clsx(
          'relative min-h-0 flex-1',
          viewMode === 'native' ? 'overflow-auto' : 'overflow-hidden',
        )}
      >
        {status === 'connecting' ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0b0e16]/80">
            <Spin />
          </div>
        ) : null}
        <div
          ref={hostRef}
          data-testid="instance-vnc-console"
          className={viewMode === 'native' ? 'min-h-full min-w-full' : 'h-full w-full overflow-hidden'}
        />
      </div>
    </div>
  )
}
