import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Empty, Input, Select, Space, Spin, Typography } from '@arco-design/web-react'
import { coreApi, CORE_API_BASE } from '@/api/client'
import { asUncontractedQuery } from '@/api/uncontracted-query'
import { ApiErrorAlert } from '@/components/common'
import { useAuthStore } from '@/stores/auth'
import type { operations } from '@/api/core-schema'

type ListInstanceLogsQuery = NonNullable<operations['listInstanceLogs']['parameters']['query']>
type LogLevel = NonNullable<ListInstanceLogsQuery['level']>
type StreamStatus = 'idle' | 'connecting' | 'connected'

const LEVEL_OPTIONS: LogLevel[] = ['debug', 'info', 'warn', 'error']
const LOG_TAIL_LINES = 100
const AUTO_SCROLL_THRESHOLD_PX = 24

function buildLogStreamUrl(instanceId: string, level: LogLevel, keyword: string, container?: string): string {
  const params = new URLSearchParams({
    follow: 'true',
    tail_lines: String(LOG_TAIL_LINES),
    level,
  })
  if (container) params.set('container', container)
  if (keyword) params.set('keyword', keyword)
  return `${CORE_API_BASE}/instances/${encodeURIComponent(instanceId)}/logs?${params.toString()}`
}

async function fetchInstanceLogs(instanceId: string, level: LogLevel, keyword: string): Promise<string> {
  const { data, error } = await coreApi.GET('/instances/{instance_id}/logs', {
    params: {
      path: { instance_id: instanceId },
      query: asUncontractedQuery({
        follow: false,
        limit: LOG_TAIL_LINES,
        level,
        keyword: keyword || undefined,
      }),
    },
    parseAs: 'text',
  })
  if (error) throw error
  return data ?? ''
}

function parseSseDataValue(value: string): string {
  try {
    const parsed = JSON.parse(value) as unknown
    if (typeof parsed === 'string') return parsed
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>
      for (const key of ['message', 'log', 'line', 'data', 'text']) {
        if (typeof record[key] === 'string') return record[key] as string
      }
    }
  } catch {
    return value
  }
  return value
}

async function readLiveLogStream(response: Response, appendLog: (line: string) => void, signal: AbortSignal) {
  if (!response.body) throw new Error('实时日志响应没有可读取的 body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const flushEvent = (rawEvent: string) => {
    const lines = rawEvent.split(/\r?\n/)
    let eventType = 'message'
    const dataLines: string[] = []

    for (const line of lines) {
      if (line.startsWith('event:')) eventType = line.slice('event:'.length).trim()
      if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trimStart())
    }

    if (eventType !== 'log' && eventType !== 'message') return
    if (!dataLines.length) return
    appendLog(parseSseDataValue(dataLines.join('\n')))
  }

  while (!signal.aborted) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() ?? ''
    for (const event of events) {
      flushEvent(event)
    }
  }

  const tail = `${buffer}${decoder.decode()}`
  if (tail.trim()) flushEvent(tail)
}

async function fetchLiveLogs({
  instanceId,
  level,
  keyword,
  container,
  signal,
  appendLog,
  onConnected,
}: {
  instanceId: string
  level: LogLevel
  keyword: string
  container?: string
  signal: AbortSignal
  appendLog: (line: string) => void
  onConnected: () => void
}) {
  const token = useAuthStore.getState().getAccessToken()
  const response = await fetch(buildLogStreamUrl(instanceId, level, keyword, container), {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    signal,
  })

  if (response.status === 401) {
    throw new Error('登录已过期或实时日志请求未带鉴权')
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || `实时日志请求失败：HTTP ${response.status}`)
  }

  onConnected()
  await readLiveLogStream(response, appendLog, signal)
}

export function InstanceLogsPanel({
  instanceId,
  active,
  container,
}: {
  instanceId: string
  active: boolean
  container?: string
}) {
  const [level, setLevel] = useState<LogLevel>('info')
  const [keyword, setKeyword] = useState('')
  const normalizedKeyword = keyword.trim()
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [liveEnabled, setLiveEnabled] = useState(false)
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle')
  const outputRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef = useRef(true)

  useEffect(() => {
    const output = outputRef.current
    if (!output || !shouldAutoScrollRef.current) return
    output.scrollTop = output.scrollHeight
  }, [logs])

  useEffect(() => {
    if (!active) {
      setLiveEnabled(false)
      setStreamStatus('idle')
      return
    }

    let cancelled = false

    async function loadHistory() {
      setLoading(true)
      setError(null)
      try {
        const history = await fetchInstanceLogs(instanceId, level, normalizedKeyword)
        if (cancelled) return
        setLogs(history)
      } catch (err) {
        if (cancelled) return
        setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [active, instanceId, level, normalizedKeyword, refreshVersion])

  useEffect(() => {
    if (!active || !liveEnabled) {
      setStreamStatus('idle')
      return
    }

    let cancelled = false
    const controller = new AbortController()

    async function connect() {
      setStreamStatus('connecting')
      setError(null)
      try {
        await fetchLiveLogs({
          instanceId,
          level,
          keyword: normalizedKeyword,
          container,
          signal: controller.signal,
          appendLog: (line) => {
            if (!cancelled) {
              setLogs((current) => (current ? `${current}\n${line}` : line))
            }
          },
          onConnected: () => {
            if (!cancelled) setStreamStatus('connected')
          },
        })
      } catch (err) {
        if (!cancelled && !controller.signal.aborted) {
          setStreamStatus('idle')
          setError(err)
        }
      }
    }

    void connect()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [active, container, instanceId, level, liveEnabled, normalizedKeyword])

  const handleScroll = () => {
    const output = outputRef.current
    if (!output) return
    const distanceToBottom = output.scrollHeight - output.scrollTop - output.clientHeight
    shouldAutoScrollRef.current = distanceToBottom <= AUTO_SCROLL_THRESHOLD_PX
  }

  if (!active) return <Empty description="打开日志 Tab 后加载实时日志" />

  return (
    <div className="space-y-3">
      <Space wrap>
        <Typography.Text type="secondary">级别过滤</Typography.Text>
        <Select data-testid="instance-log-level-select" value={level} onChange={setLevel} style={{ width: 140 }}>
          {LEVEL_OPTIONS.map((item) => (
            <Select.Option key={item} value={item}>
              {item}
            </Select.Option>
          ))}
        </Select>
        <Input
          value={keyword}
          allowClear
          placeholder="搜索日志关键词"
          style={{ width: 240 }}
          onChange={setKeyword}
        />
        <Button loading={loading} onClick={() => setRefreshVersion((version) => version + 1)}>
          拉取日志
        </Button>
        <Button type={liveEnabled ? 'secondary' : 'primary'} onClick={() => setLiveEnabled((enabled) => !enabled)}>
          {liveEnabled ? '停止跟随' : '开启跟随'}
        </Button>
        <Typography.Text type="secondary">
          {streamStatus === 'connected' ? '实时日志已连接' : null}
          {streamStatus === 'connecting' ? '正在连接实时日志…' : null}
        </Typography.Text>
      </Space>
      {liveEnabled && streamStatus === 'idle' && !error ? <Alert type="warning" content="实时日志未连接" /> : null}
      {error ? <ApiErrorAlert error={error} /> : null}
      <div
        ref={outputRef}
        className="max-h-[520px] overflow-auto rounded border border-[var(--color-border-2)]"
        onScroll={handleScroll}
      >
        {loading && logs.length === 0 ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8">
            <Empty description="暂无日志" />
          </div>
        ) : (
          <pre className="m-0 whitespace-pre-wrap break-words bg-[var(--color-fill-1)] p-3 font-mono text-xs leading-5 text-[var(--color-text-1)]">
            {logs}
          </pre>
        )}
      </div>
    </div>
  )
}
