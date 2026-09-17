import { InstanceVncConsole } from "@/components/instances/InstanceVncConsole";

export function VmInstanceRemotePage({ instanceId }: { instanceId: string }) {
  return (
    <main className="h-dvh min-h-0 w-screen overflow-hidden bg-[#0b0e16]">
      <InstanceVncConsole instanceId={instanceId} />
    </main>
  );
}
