import { InstanceLogsPanel } from "@/components/instances/InstanceLogsPanel";

export function GpuInstanceLogs({ instanceId }: { instanceId: string }) {
  return <InstanceLogsPanel instanceId={instanceId} active />;
}
