import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { Button, Space, Tag } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { newIdempotencyKey } from '@/lib/idempotency'

type TerminalStatus = 'idle' | 'connecting' | 'connected' | 'closed' | 'error'

const TERMINAL_THEME = {
  background: '#0b0e16',
  foreground: '#e6e6e6',
  cursor: '#e6e6e6',
  selectionBackground: 'rgba(120, 150, 255, 0.35)',
}

const STATUS_META: Record<TerminalStatus, { text: string; color: string }> = {
  idle: { text: '未连接', color: 'gray' },
  connecting: { text: '连接中', color: 'blue' },
  connected: { text: '已连接', color: 'green' },
  closed: { text: '已断开', color: 'gray' },
  error: { text: '连接异常', color: 'red' },
}

function packStdin(data: string): string {
  return JSON.stringify({ Op: 'stdin', Data: data })
}

function packResize(cols: number, rows: number): string {
  return JSON.stringify({ Op: 'resize', Cols: cols, Rows: rows })
}

function unpackTerminalOutput(data: string): string {
  try {
    const parsed = JSON.parse(data) as { Data?: unknown }
    if (typeof parsed.Data === 'string') return parsed.Data
  } catch {
    // 非 JSON 输出按原始文本写入，兼容当前 Core 契约。
  }
  return data
}

function keyEventToTerminalData(event: KeyboardEvent): string | null {
  if (event.metaKey || event.altKey) return null
  if (event.key.length === 1) return event.key
  if (event.key === 'Enter') return '\r'
  if (event.key === 'Backspace') return '\x7f'
  if (event.key === 'Tab') return '\t'
  if (event.key === 'Escape') return '\x1b'
  return null
}

export function InstanceTerminal({
  instanceId,
  container,
  command = ['/bin/sh'],
  height = 420,
}: {
  instanceId: string
  container?: string
  command?: string[]
  height?: number | string
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<TerminalStatus>('idle')
  const [connectSeq, setConnectSeq] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
      theme: TERMINAL_THEME,
      convertEol: true,
      cols: 120,
      rows: 30,
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    termRef.current = term
    fitRef.current = fitAddon

    let disposed = false
    let opened = false
    let openFrame: number | null = null
    let focusFrame: number | null = null
    let fitFrame: number | null = null
    let connectTimer: number | null = null
    let terminalActive = false
    const decoder = new TextDecoder()
    const safeWrite = (data: string) => {
      try {
        term.write(data)
      } catch {
        scheduleFit()
        window.requestAnimationFrame(() => {
          if (!disposed) {
            try {
              term.write(data)
            } catch {
              // xterm renderer can be temporarily unavailable during first layout.
            }
          }
        })
      }
    }
    const sendStdin = (data: string) => {
      const socket = socketRef.current
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(packStdin(data))
      }
    }
    const focusTerminal = () => {
      terminalActive = true
      host.focus()
      try {
        term.focus()
      } catch {
        // xterm 还未完成 DOM 初始化时忽略，后续点击或连接成功会再次聚焦
      }
    }
    const focusTerminalSoon = () => {
      if (focusFrame != null) window.cancelAnimationFrame(focusFrame)
      focusFrame = window.requestAnimationFrame(() => {
        focusFrame = null
        if (!disposed) focusTerminal()
      })
    }
    const sendResize = () => {
      const socket = socketRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN) return
      socket.send(packResize(term.cols, term.rows))
    }
    const fitAndResize = () => {
      if (!opened || disposed) return
      if (host.clientWidth === 0 || host.clientHeight === 0) return
      try {
        fitAddon.fit()
      } catch {
        return
      }
      sendResize()
    }
    const scheduleFit = () => {
      if (fitFrame != null) window.cancelAnimationFrame(fitFrame)
      fitFrame = window.requestAnimationFrame(() => {
        fitFrame = window.requestAnimationFrame(() => {
          fitFrame = null
          fitAndResize()
        })
      })
    }

    const resizeObserver = new ResizeObserver(() => scheduleFit())
    resizeObserver.observe(host)
    host.addEventListener('mousedown', focusTerminal)
    const shouldUseKeyboardFallback = (event: KeyboardEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return false
      if (!host.contains(target) && !terminalActive) return false
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase()
        if (tagName === 'textarea' || tagName === 'input' || target.isContentEditable) return false
      }
      return true
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldUseKeyboardFallback(event)) return
      const data = keyEventToTerminalData(event)
      if (data == null) return
      event.preventDefault()
      event.stopPropagation()
      sendStdin(data)
    }
    const handleWindowMouseDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node) || !host.contains(target)) terminalActive = false
    }
    host.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('mousedown', handleWindowMouseDown, true)

    const dataDisposable = term.onData((data) => {
      sendStdin(data)
    })
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      const socket = socketRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN) return
      socket.send(packResize(cols, rows))
    })

    const resolveWebSocketUrl = (wsUrl: string, token?: string) => {
      try {
        const url = new URL(wsUrl)
        if (!url.searchParams.has('token') && token) {
          url.searchParams.set('token', token)
        }
        return url.toString()
      } catch {
        if (!token || /(?:^|[?&])token=/.test(wsUrl)) return wsUrl
        return `${wsUrl}${wsUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
      }
    }

    const connect = async () => {
      setStatus('connecting')
      term.writeln('\x1b[90m正在建立终端连接…\x1b[0m')
      try {
        const { data, error, response } = await coreApi.POST('/instances/{instance_id}/exec', {
          params: { path: { instance_id: instanceId } },
          body: {
            idempotency_key: newIdempotencyKey(),
            container: container?.trim() || null,
            command,
            tty: true,
            rows: term.rows,
            cols: term.cols,
          },
        })
        if (error) {
          if (response.status === 401 || response.status === 403) {
            throw new Error('登录失效或没有实例 exec 权限')
          }
          throw error
        }
        if (!data?.ws_url) throw new Error('终端连接地址为空')
        if (disposed) return

        const wsUrl = resolveWebSocketUrl(data.ws_url, data.token)
        const socket = new WebSocket(wsUrl)
        socket.binaryType = 'arraybuffer'
        socketRef.current = socket
        socket.onopen = () => {
          if (disposed) return
          setStatus('connected')
          scheduleFit()
          focusTerminalSoon()
        }
        socket.onmessage = (event) => {
          if (typeof event.data === 'string') {
            const output = unpackTerminalOutput(event.data)
            if (output) safeWrite(output)
            return
          }
          if (event.data instanceof ArrayBuffer) {
            const output = unpackTerminalOutput(decoder.decode(event.data))
            if (output) safeWrite(output)
            return
          }
          if (event.data instanceof Blob) {
            void event.data.text().then((text) => {
              if (!disposed) {
                const output = unpackTerminalOutput(text)
                if (output) safeWrite(output)
              }
            })
          }
        }
        socket.onerror = () => {
          if (disposed) return
          setStatus('error')
          term.writeln('\r\n\x1b[31m终端连接异常\x1b[0m')
        }
        socket.onclose = () => {
          if (disposed) return
          setStatus((current) => (current === 'error' ? current : 'closed'))
          term.writeln('\r\n\x1b[90m连接已关闭\x1b[0m')
        }
      } catch (e) {
        if (disposed) return
        setStatus('error')
        const message = e instanceof Error ? e.message : '终端连接失败'
        term.writeln(`\r\n\x1b[31m${message}\x1b[0m`)
      }
    }

    const ensureOpen = () => {
      if (disposed || opened) return
      if (host.clientWidth === 0 || host.clientHeight === 0) {
        openFrame = window.requestAnimationFrame(ensureOpen)
        return
      }
      term.open(host)
      opened = true
      scheduleFit()
      connectTimer = window.setTimeout(() => {
        void connect()
      }, 0)
    }
    ensureOpen()

    return () => {
      disposed = true
      if (openFrame != null) window.cancelAnimationFrame(openFrame)
      if (focusFrame != null) window.cancelAnimationFrame(focusFrame)
      if (fitFrame != null) window.cancelAnimationFrame(fitFrame)
      if (connectTimer != null) window.clearTimeout(connectTimer)
      resizeObserver.disconnect()
      host.removeEventListener('mousedown', focusTerminal)
      host.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('mousedown', handleWindowMouseDown, true)
      dataDisposable.dispose()
      resizeDisposable.dispose()
      socketRef.current?.close()
      socketRef.current = null
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
    // connectSeq 变化时重新建立连接
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    instanceId,
    container,
    connectSeq,
  ])

  const meta = STATUS_META[status]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Space>
          <span className="text-sm text-(--color-text-2)">状态</span>
          <Tag color={meta.color}>{meta.text}</Tag>
        </Space>
        <Button
          size="small"
          loading={status === 'connecting'}
          disabled={status === 'connected' || status === 'connecting'}
          onClick={() => setConnectSeq((n) => n + 1)}
        >
          重新连接
        </Button>
      </div>
      <div
        ref={hostRef}
        data-testid="instance-terminal-output"
        tabIndex={0}
        style={{
          height,
          padding: 8,
          borderRadius: 6,
          background: TERMINAL_THEME.background,
          overflow: 'hidden',
        }}
      />
    </div>
  )
}
