import { Button, Space } from '@arco-design/web-react'
import { InstanceTerminal } from '@/components/instances/InstanceTerminal'

export function InstanceTerminalPage({ instanceId }: { instanceId: string }) {
  return (
    <div className="min-h-screen bg-[#0b0e16] p-3 text-white">
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">终端</div>
          <div className="truncate text-xs text-gray-400">{instanceId}</div>
        </div>
        <Space>
          <Button size="small" onClick={() => window.close()}>
            关闭窗口
          </Button>
        </Space>
      </div>
      <InstanceTerminal instanceId={instanceId} height="calc(100vh - 76px)" />
    </div>
  )
}
