type NetworkishRecord = Record<string, unknown>

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readNestedString(record: NetworkishRecord, objectKey: string, fieldKey: string): string | undefined {
  const nested = record[objectKey]
  if (!nested || typeof nested !== 'object') return undefined
  return readString((nested as NetworkishRecord)[fieldKey])
}

export function getInstanceNetworkValue(instance: unknown, field: 'vpc_id' | 'subnet_id'): string {
  if (!instance || typeof instance !== 'object') return '-'
  const record = instance as NetworkishRecord
  return readString(record[field]) ?? readNestedString(record, 'network', field) ?? '-'
}

export function getInstanceDisplayIp(instance: unknown): string {
  if (!instance || typeof instance !== 'object') return '-'
  const record = instance as NetworkishRecord
  return (
    readString(record.private_ip) ??
    readNestedString(record, 'network', 'private_ip') ??
    readString(record.ip_address) ??
    readString(record.endpoint) ??
    readNestedString(record, 'ssh', 'host') ??
    '-'
  )
}
