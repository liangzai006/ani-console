import { InstanceTerminal } from "@/components/instances/InstanceTerminal";

export function SandboxInstanceTerminalPage({ instanceId }: { instanceId: string }) {
  return (
    <main className="h-dvh min-h-0 w-screen overflow-hidden bg-app-bg p-4">
      <InstanceTerminal className="h-full" instanceId={instanceId} />
    </main>
  );
}
