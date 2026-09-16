type ProviderLike = {
  provider?: string | null;
  dev_profile?: {
    mode?: string | null;
    provider?: string | null;
    real_provider?: boolean | null;
  } | null;
};

export function parseSandboxCommand(value: string): string[] | undefined {
  const input = value.trim();
  if (!input) return undefined;

  const parts: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaping) current += "\\";
  if (current) parts.push(current);
  return parts.length ? parts : undefined;
}

export function getSandboxProviderLabel(instance: ProviderLike): string {
  const provider = instance.provider ?? instance.dev_profile?.provider ?? "-";
  const realProvider = instance.dev_profile?.real_provider;

  if (instance.dev_profile?.mode === "local") return "本地开发模式";
  if (realProvider === true && provider === "kubernetes_rest") return "真实 Kubernetes/Kata 后端";
  if (realProvider === false && provider !== "-") return `${provider}（real_provider=false）`;
  return provider;
}
