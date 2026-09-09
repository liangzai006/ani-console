type ProviderLike = {
  provider?: string | null;
  dev_profile?: {
    mode?: string | null;
    provider?: string | null;
    real_provider?: boolean | null;
  } | null;
};

type ApiErrorLike = {
  status?: number;
  code?: string;
  message?: string;
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

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as ApiErrorLike;
  if (typeof candidate.status === "number") return candidate.status;
  const response = (error as { response?: { status?: number } }).response;
  return typeof response?.status === "number" ? response.status : undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as ApiErrorLike;
  return typeof candidate.message === "string" && candidate.message ? candidate.message : undefined;
}

export function getInstanceActionErrorMessage(
  error: unknown,
  action: "create" | "lifecycle",
): string {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error)?.trim();

  if (message) return message;
  if (action === "lifecycle" && status === 404) return "资源可能已被清理或状态不同步";
  if (status && status >= 500)
    return action === "create" ? "创建失败，请检查配置后重试" : "资源可能已被清理或状态不同步";
  return action === "create" ? "创建失败，请检查配置后重试" : "操作失败，请稍后重试";
}
