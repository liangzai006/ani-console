import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Empty, Select, Space, Spin, Typography } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { ApiErrorAlert } from '@/components/common'
import type { operations } from '@/api/core-schema'

type StreamInstanceLogsQuery = NonNullable<operations['streamInstanceLogs']['parameters']['query']>
type LogLevel = NonNullable<StreamInstanceLogsQuery['level']>
type LevelFilter = LogLevel | 'all'
type StreamStatus = 'idle' | 'connecting' | 'connected'

type InstanceLog = {
  timestamp: string
  level: string
  message: string
  container: string
  stream: string
}

type StreamResult = { type: 'done'; reason: string } | { type: 'closed' }

const LEVEL_OPTIONS: Array<{ label: string; value: LevelFilter }> = [
  { label: '全部级别', value: 'all' },
  { label: 'debug', value: 'debug' },
  { label: 'info', value: 'info' },
  { label: 'warn', value: 'warn' },
  { label: 'error', value: 'error' },
]
const LOG_LIMIT = 1000
const LOG_INTERVAL_SECONDS = 2
const AUTO_SCROLL_THRESHOLD_PX = 24
const TIMEOUT_RECONNECT_DELAY_MS = 500

function parseInstanceLog(payload: string): InstanceLog {
  const value = JSON.parse(payload) as Partial<InstanceLog>
  if (typeof value.message !== 'string') throw new Error('日志流返回了无法识别的日志数据')
  return {
    timestamp: typeof value.timestamp === 'string' ? value.timestamp : '',
    level: typeof value.level === 'string' ? value.level : '',
    message: value.message,
    container: typeof value.container === 'string' ? value.container : '',
    stream: typeof value.stream === 'string' ? value.stream : '',
  }
}

function logIdentity(log: InstanceLog): string {
  return [log.timestamp, log.container, log.stream, log.level, log.message].join('\u0000')
}

function formatLog(log: InstanceLog): string {
  const metadata = [log.timestamp, log.container, log.level, log.stream].filter(Boolean).map((item) => `[${item}]`)
  return metadata.length ? `${metadata.join(' ')} ${log.message}` : log.message
}

async function readErrorPayload(payload: unknown): Promise<{ code?: string; message?: string }> {
  if (!(payload instanceof ReadableStream)) return {}
  const text = await new Response(payload).text()
  try {
    return JSON.parse(text) as { code?: string; message?: string }
  } catch {
    return text ? { message: text } : {}
  }
}

function createPreStreamError(status: number, payload: { code?: string; message?: string }): Error {
  const message =
    status === 400
      ? '日志流参数错误'
      : status === 401
        ? '登录状态已失效，请重新登录'
        : status === 403
          ? '没有查看实例日志的权限'
          : status === 404
            ? '实例不存在或已删除'
            : status === 503
              ? '当前环境不支持日志流'
              : payload.message || `日志流连接失败（HTTP ${status}）`
  return new Error(message)
}

async function readLogStream(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  appendLog: (log: InstanceLog) => void,
): Promise<StreamResult> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const consumeFrame = (rawFrame: string): StreamResult | undefined => {
    let eventType = 'message'
    const dataLines: string[] = []
    for (const line of rawFrame.split(/\r?\n/)) {
      if (line.startsWith('event:')) eventType = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
    }
    if (!dataLines.length) return

    const payload = dataLines.join('\n')
    if (eventType === 'log') {
      appendLog(parseInstanceLog(payload))
      return
    }
    if (eventType === 'error') {
      const error = JSON.parse(payload) as { message?: string }
      throw new Error(error.message || '日志流发生错误')
    }
    if (eventType === 'done') {
      const done = JSON.parse(payload) as { reason?: string }
      return { type: 'done', reason: done.reason || 'closed' }
    }
  }

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read()
      if (done) throw new Error('日志流连接已断开，请重新连接')
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split(/\r?\n\r?\n/)
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        const result = consumeFrame(frame)
        if (result) return result
      }
    }
    return { type: 'closed' }
  } finally {
    reader.releaseLock()
  }
}

async function connectLogStream({
  instanceId,
  level,
  signal,
  appendLog,
  onConnected,
}: {
  instanceId: string
  level: LevelFilter
  signal: AbortSignal
  appendLog: (log: InstanceLog) => void
  onConnected: () => void
}): Promise<StreamResult> {
  const { data, error, response } = await coreApi.GET('/instances/{instance_id}/logs/stream', {
    params: {
      path: { instance_id: instanceId },
      query: {
        limit: LOG_LIMIT,
        interval_seconds: LOG_INTERVAL_SECONDS,
        level: level === 'all' ? undefined : level,
      },
    },
    parseAs: 'stream',
    signal,
  })

  if (!response.ok || error) {
    throw createPreStreamError(response.status, await readErrorPayload(error))
  }
  if (!data) throw new Error('日志流响应没有可读取的内容')

  onConnected()
  return readLogStream(data, signal, appendLog)
}

export function InstanceLogsPanel({ instanceId, active }: { instanceId: string; active: boolean; container?: string }) {
  const [level, setLevel] = useState<LevelFilter>('all')
  const [reconnectVersion, setReconnectVersion] = useState(0)
  const [logs, setLogs] = useState<InstanceLog[]>([])
  const [error, setError] = useState<unknown>(null)
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle')
  const outputRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef = useRef(true)
  const knownLogsRef = useRef(new Set<string>())

  useEffect(() => {
    const output = outputRef.current
    if (!output || !shouldAutoScrollRef.current) return
    output.scrollTop = output.scrollHeight
  }, [logs])

  useEffect(() => {
    if (!active) {
      setStreamStatus('idle')
      return
    }

    let cancelled = false
    const controller = new AbortController()
    knownLogsRef.current.clear()
    setLogs([])

    const appendLog = (log: InstanceLog) => {
      if (cancelled) return
      const identity = logIdentity(log)
      if (knownLogsRef.current.has(identity)) return
      knownLogsRef.current.add(identity)
      setLogs((current) => [...current, log])
    }

    async function connect() {
      setError(null)
      while (!cancelled && !controller.signal.aborted) {
        setStreamStatus('connecting')
        try {
          const result = await connectLogStream({
            instanceId,
            level,
            signal: controller.signal,
            appendLog,
            onConnected: () => {
              if (!cancelled) setStreamStatus('connected')
            },
          })
          if (result.type !== 'done' || result.reason !== 'timeout') {
            if (!cancelled) setStreamStatus('idle')
            return
          }
          await new Promise((resolve) => setTimeout(resolve, TIMEOUT_RECONNECT_DELAY_MS))
        } catch (nextError) {
          if (!cancelled && !controller.signal.aborted) {
            setStreamStatus('idle')
            setError(nextError)
          }
          return
        }
      }
    }

    void connect()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [active, instanceId, level, reconnectVersion])

  const handleScroll = () => {
    const output = outputRef.current
    if (!output) return
    const distanceToBottom = output.scrollHeight - output.scrollTop - output.clientHeight
    shouldAutoScrollRef.current = distanceToBottom <= AUTO_SCROLL_THRESHOLD_PX
  }

  if (!active) return <Empty description="打开日志 Tab 后连接日志流" />

  return (
    <div className="flex flex-col gap-3">
      <Space wrap>
        <Typography.Text type="secondary">级别过滤</Typography.Text>
        <Select data-testid="instance-log-level-select" value={level} onChange={setLevel} style={{ width: 140 }}>
          {LEVEL_OPTIONS.map((item) => (
            <Select.Option key={item.value} value={item.value}>
              {item.label}
            </Select.Option>
          ))}
        </Select>
        <Button loading={streamStatus === 'connecting'} onClick={() => setReconnectVersion((version) => version + 1)}>
          重新连接
        </Button>
        <Typography.Text type="secondary">
          {streamStatus === 'connected' ? '日志流已连接' : null}
          {streamStatus === 'connecting' ? '正在连接日志流…' : null}
        </Typography.Text>
      </Space>
      {error ? <ApiErrorAlert error={error} title="日志流连接失败" /> : null}
      <div
        ref={outputRef}
        className="max-h-130 overflow-auto rounded border border-(--color-border-2)"
        onScroll={handleScroll}
      >
        {streamStatus === 'connecting' && logs.length === 0 ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8">
            <Empty description={streamStatus === 'connected' ? '等待新日志' : '暂无日志'} />
          </div>
        ) : (
          <pre className="m-0 whitespace-pre-wrap wrap-break-word bg-(--color-fill-1) p-3 font-mono text-xs leading-5 text-(--color-text-1)">
            {logs.map(formatLog).join('\n')}
          </pre>
        )}
      </div>
      {streamStatus === 'connected' && logs.length === 0 ? (
        <Alert type="info" content="连接正常，正在等待实例产生新日志。" />
      ) : null}
    </div>
  )
}
