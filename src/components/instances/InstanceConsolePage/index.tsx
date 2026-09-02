import { Button, Space } from '@arco-design/web-react'
import { InstanceVncConsole } from '@/components/instances/InstanceVncConsole'

export function InstanceConsolePage({ instanceId }: { instanceId: string }) {
  return (
    <div className="min-h-screen bg-[#0b0e16] p-3 text-white">
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">VNC 控制台</div>
          <div className="truncate text-xs text-gray-400">{instanceId}</div>
        </div>
        <Space>
          <Button size="small" onClick={() => window.close()}>
            关闭窗口
          </Button>
        </Space>
      </div>
      <div className="h-[calc(100vh-76px)] overflow-hidden">
        <InstanceVncConsole instanceId={instanceId} />
      </div>
    </div>
  )
}
