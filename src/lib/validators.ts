export const scopePattern = /^scope:[a-z0-9_-]+:(\*|[a-z0-9_-]+)$/;
export const bucketNamePattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

export function isValidScope(value: string): boolean {
  return scopePattern.test(value.trim());
}

export function parseScopeList(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function assertNonEmpty(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label}不能为空`);
  return trimmed;
}

export function assertMaxLength(value: string, max: number, label: string): string {
  if (value.length > max) throw new Error(`${label}不能超过 ${max} 个字符`);
  return value;
}

export function assertIntegerRange(value: number, min: number, max: number, label: string): number {
  if (!Number.isInteger(value)) throw new Error(`${label}必须是整数`);
  if (value < min || value > max) throw new Error(`${label}必须在 ${min}-${max} 之间`);
  return value;
}

function isIpv4(value: string): boolean {
  const parts = value.trim().split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => {
      if (!/^\d+$/.test(part)) return false;
      if (part.length > 1 && part.startsWith("0")) return false;
      const n = Number(part);
      return n >= 0 && n <= 255;
    })
  );
}

function parseIpv4Cidr(value: string): { ip: number; prefix: number; size: number } {
  const cidr = requireIpv4Cidr(value, "CIDR");
  const [ip, prefix] = cidr.split("/");
  const bytes = ip.split(".").map(Number);
  const ipNumber = bytes.reduce((sum, byte) => sum * 256 + byte, 0);
  const prefixNumber = Number(prefix);
  return { ip: ipNumber, prefix: prefixNumber, size: 2 ** (32 - prefixNumber) };
}

function cidrToIp(value: number): string {
  return [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join(".");
}

export function requireIpv4Cidr(value: string, label: string): string {
  const trimmed = value.trim();
  const [ip, prefix, extra] = trimmed.split("/");
  const prefixNumber = Number(prefix);
  if (
    extra !== undefined ||
    !isIpv4(ip) ||
    !/^\d+$/.test(prefix ?? "") ||
    prefixNumber < 0 ||
    prefixNumber > 32
  ) {
    throw new Error(`${label}必须是有效的 IPv4 CIDR`);
  }
  return trimmed;
}

export function requireIpv4CidrWithin(
  value: string,
  parentCidr: string,
  label: string,
  parentLabel: string,
): string {
  const trimmed = requireIpv4Cidr(value, label);
  const child = parseIpv4Cidr(trimmed);
  const parent = parseIpv4Cidr(parentCidr);
  if (
    child.ip < parent.ip ||
    child.ip + child.size > parent.ip + parent.size ||
    child.prefix < parent.prefix
  ) {
    throw new Error(`${label}必须在 ${parentLabel} 范围内`);
  }
  return trimmed;
}

export function ipv4CidrError(value: string, label: string): string | undefined {
  try {
    requireIpv4Cidr(value, label);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function ipv4CidrWithinError(
  value: string,
  parentCidr: string,
  label: string,
  parentLabel: string,
): string | undefined {
  try {
    requireIpv4CidrWithin(value, parentCidr, label, parentLabel);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function suggestSubnetCidr(vpcCidr: string): string {
  const parent = parseIpv4Cidr(vpcCidr);
  const prefix = Math.min(32, Math.max(parent.prefix + 1, 24));
  return `${cidrToIp(parent.ip)}/${prefix}`;
}

export function suggestGatewayIp(subnetCidr: string): string {
  const subnet = parseIpv4Cidr(subnetCidr);
  return cidrToIp(subnet.ip + (subnet.size > 1 ? 1 : 0));
}

export function subnetFixedOctets(vpcCidr: string): boolean[] {
  const { prefix } = parseIpv4Cidr(vpcCidr);
  return [8, 16, 24, 32].map((bits) => prefix >= bits);
}

export function optionalIpv4(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!isIpv4(trimmed)) throw new Error(`${label}必须是有效的 IPv4 地址`);
  return trimmed;
}

export function optionalIpv4Error(value: string, label: string): string | undefined {
  try {
    optionalIpv4(value, label);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function optionalIpv4WithinCidr(
  value: string,
  cidr: string,
  label: string,
  cidrLabel: string,
): string | undefined {
  const trimmed = optionalIpv4(value, label);
  if (!trimmed) return undefined;
  const ip = trimmed
    .split(".")
    .map(Number)
    .reduce((sum, byte) => sum * 256 + byte, 0);
  const subnet = parseIpv4Cidr(cidr);
  if (ip < subnet.ip || ip >= subnet.ip + subnet.size) {
    throw new Error(`${label}必须在 ${cidrLabel} 范围内`);
  }
  return trimmed;
}

export function optionalIpv4WithinCidrError(
  value: string,
  cidr: string,
  label: string,
  cidrLabel: string,
): string | undefined {
  try {
    optionalIpv4WithinCidr(value, cidr, label, cidrLabel);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function optionalIsoDateTime(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) throw new Error("过期时间必须是有效的日期时间");
  return new Date(timestamp).toISOString();
}
