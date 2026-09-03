import { useEffect, useRef, useState } from 'react'
import { Button, Message, Space, Tag } from '@arco-design/web-react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import clsx from 'clsx'
import '@xterm/xterm/css/xterm.css'
import { coreApi } from '@/api/client'
import { useIdempotencyScope } from '@/hooks/useIdempotencyScope'
import styles from './index.module.css'

type TerminalStatus = 'connecting' | 'connected' | 'closed' | 'error'

type TerminalMessage = {
  type?: unknown
  data?: unknown
  code?: unknown
  message?: unknown
}

const TERMINAL_SUBPROTOCOL = 'ani.terminal.v1'

const TERMINAL_THEME = {
  background: '#0b0e16',
  foreground: '#e6e6e6',
  cursor: '#e6e6e6',
  selectionBackground: 'rgba(120, 150, 255, 0.35)',
}

const STATUS_META: Record<TerminalStatus, { text: string; color: string }> = {
  connecting: { text: '连接中', color: 'blue' },
  connected: { text: '已连接', color: 'green' },
  closed: { text: '已断开', color: 'gray' },
  error: { text: '连接异常', color: 'red' },
}

function packStdin(data: string) {
  return JSON.stringify({ type: 'stdin', data })
}

function packResize(cols: number, rows: number) {
  return JSON.stringify({ type: 'resize', cols, rows })
}

function getSessionError(error: unknown, status: number) {
  if (status === 401 || status === 403) return '登录失效或没有实例 exec 权限'
  if (status === 404) return '实例不存在或终端服务不可用'
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return '终端会话创建失败'
}

function writeGatewayMessage(term: Terminal, raw: string, onError: (message: string) => void) {
  let message: TerminalMessage
  try {
    message = JSON.parse(raw) as TerminalMessage
  } catch {
    term.write(raw)
    return
  }

  if ((message.type === 'stdout' || message.type === 'stderr') && typeof message.data === 'string') {
    term.write(message.data)
    return
  }
  if (message.type === 'toast' && typeof message.data === 'string') {
    Message.info(message.data)
    return
  }
  if (message.type === 'exit') {
    term.writeln(`\r\n\x1b[90m[进程已退出${message.code == null ? '' : `，退出码 ${String(message.code)}`}]\x1b[0m`)
    return
  }
  if (message.type === 'error') {
    const detail = typeof message.message === 'string' ? message.message : '终端流处理失败'
    const code = typeof message.code === 'string' ? `（${message.code}）` : ''
    const error = `${detail}${code}`
    term.writeln(`\r\n\x1b[31m${error}\x1b[0m`)
    onError(error)
    return
  }

  term.writeln(`\r\n\x1b[33m[未识别的终端消息] ${raw}\x1b[0m`)
}

export function InstanceTerminal({
  instanceId,
  container,
  command = ['/bin/sh'],
  height = '100%',
  className,
}: {
  instanceId: string
  container?: string
  command?: string[]
  height?: number | string
  className?: string
}) {
  const execScope = useIdempotencyScope('instance-terminal-session-create', ['POST', instanceId])
  const hostRef = useRef<HTMLDivElement | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<TerminalStatus>('connecting')
  const [errorMessage, setErrorMessage] = useState('')
  const [connectSeq, setConnectSeq] = useState(0)
  const commandSignature = JSON.stringify(command)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
      theme: TERMINAL_THEME,
      convertEol: true,
      scrollback: 5000,
      cols: 80,
      rows: 24,
    })
    const fitAddon = new FitAddon()
    const abortController = new AbortController()
    const decoder = new TextDecoder()
    let disposed = false
    let socketFailed = false
    let fitFrame: number | undefined
    let lastResize = ''

    setStatus('connecting')
    setErrorMessage('')
    term.loadAddon(fitAddon)
    term.open(host)

    const sendResize = (cols: number, rows: number) => {
      const socket = socketRef.current
      const dimensions = `${cols}x${rows}`
      if (socket?.readyState !== WebSocket.OPEN || dimensions === lastResize) return
      lastResize = dimensions
      socket.send(packResize(cols, rows))
    }

    const fit = () => {
      if (disposed || host.clientWidth === 0 || host.clientHeight === 0) return
      try {
        fitAddon.fit()
      } catch {
        // xterm 尚未完成首帧布局时等待下一次 ResizeObserver 回调。
      }
    }

    const scheduleFit = () => {
      if (fitFrame !== undefined) window.cancelAnimationFrame(fitFrame)
      fitFrame = window.requestAnimationFrame(() => {
        fitFrame = undefined
        fit()
      })
    }

    const inputDisposable = term.onData((data) => {
      const socket = socketRef.current
      if (socket?.readyState === WebSocket.OPEN) socket.send(packStdin(data))
    })
    const resizeDisposable = term.onResize(({ cols, rows }) => sendResize(cols, rows))
    const resizeObserver = new ResizeObserver(scheduleFit)
    resizeObserver.observe(host)

    const handleMessage = async (data: string | ArrayBuffer | Blob) => {
      let text: string
      if (typeof data === 'string') text = data
      else if (data instanceof ArrayBuffer) text = decoder.decode(data)
      else text = await data.text()
      if (!disposed) {
        writeGatewayMessage(term, text, (message) => {
          setStatus('error')
          setErrorMessage(message)
        })
      }
    }

    const connect = async () => {
      scheduleFit()
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      if (disposed) return
      fit()

      try {
        const submitData = {
          container: container?.trim() || null,
          command: JSON.parse(commandSignature) as string[],
          tty: true,
          rows: term.rows,
          cols: term.cols,
        }
        const { data, error, response } = await coreApi.POST('/instances/{instance_id}/exec', {
          params: { path: { instance_id: instanceId } },
          body: execScope.withKey(submitData),
          signal: abortController.signal,
        })
        if (error) throw new Error(getSessionError(error, response.status))
        execScope.reset()
        if (!data?.ws_url) throw new Error('终端连接地址为空')
        if (disposed) return

        const socket = new WebSocket(data.ws_url, TERMINAL_SUBPROTOCOL)
        socket.binaryType = 'arraybuffer'
        socketRef.current = socket

        socket.onopen = () => {
          if (disposed || socketRef.current !== socket) return
          setStatus('connected')
          scheduleFit()
          sendResize(term.cols, term.rows)
          term.focus()
        }
        socket.onmessage = (event) => {
          if (socketRef.current !== socket) return
          void handleMessage(event.data).catch(() => {
            if (!disposed) term.writeln('\r\n\x1b[33m终端消息解析失败\x1b[0m')
          })
        }
        socket.onerror = () => {
          if (disposed || socketRef.current !== socket) return
          socketFailed = true
          setStatus('error')
          setErrorMessage('WebSocket 连接失败，请检查网络和终端网关')
          term.writeln('\r\n\x1b[31m终端连接异常\x1b[0m')
        }
        socket.onclose = (event) => {
          if (disposed || socketRef.current !== socket) return
          socketRef.current = null
          if (!socketFailed) {
            setStatus('closed')
            setErrorMessage(event.reason || `连接已关闭（${event.code}）`)
            term.writeln('\r\n\x1b[90m连接已关闭\x1b[0m')
          }
        }
      } catch (error) {
        if (disposed || abortController.signal.aborted) return
        const message = error instanceof Error ? error.message : '终端连接失败'
        setStatus('error')
        setErrorMessage(message)
        term.writeln(`\r\n\x1b[31m${message}\x1b[0m`)
      }
    }

    void connect()

    return () => {
      disposed = true
      abortController.abort()
      if (fitFrame !== undefined) window.cancelAnimationFrame(fitFrame)
      resizeObserver.disconnect()
      inputDisposable.dispose()
      resizeDisposable.dispose()
      const socket = socketRef.current
      socketRef.current = null
      if (socket && socket.readyState !== WebSocket.CLOSED) socket.close(1000, 'terminal tab closed')
      term.dispose()
    }
  }, [commandSignature, connectSeq, container, execScope, instanceId])

  const meta = STATUS_META[status]

  return (
    <div className={clsx('flex min-h-0 flex-col gap-3', className)}>
      <div className="flex shrink-0 items-center justify-between gap-4">
        <Space>
          <span className="text-sm text-(--color-text-2)">状态</span>
          <Tag color={meta.color}>{meta.text}</Tag>
          {errorMessage ? <span className="text-sm text-(--color-text-3)">{errorMessage}</span> : null}
        </Space>
        <Button
          size="small"
          loading={status === 'connecting'}
          disabled={status === 'connected' || status === 'connecting'}
          onClick={() => setConnectSeq((current) => current + 1)}
        >
          重新连接
        </Button>
      </div>
      <div
        ref={hostRef}
        className={clsx(styles.terminalHost, 'min-h-0 flex-1')}
        data-testid="instance-terminal-output"
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
