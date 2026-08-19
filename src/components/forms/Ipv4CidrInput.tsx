import { InputNumber } from '@arco-design/web-react'

interface Ipv4CidrInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  withPrefix?: boolean
  disabledOctets?: boolean[]
  minPrefix?: number
}

function toInputNumber(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined
  return Number(value)
}

function splitCidr(value: string, placeholder: string): [string[], string] {
  const [ip = placeholder, prefix = '24'] = value.split('/')
  const octets = ip.split('.')
  return [[octets[0] ?? '', octets[1] ?? '', octets[2] ?? '', octets[3] ?? ''], prefix]
}

export function Ipv4CidrInput({
  value,
  onChange,
  placeholder = '10.80.1.0',
  withPrefix,
  disabledOctets = [],
  minPrefix = 0,
}: Ipv4CidrInputProps) {
  const [octets, prefix] = splitCidr(value, placeholder)

  const emit = (nextOctets: string[], nextPrefix: string) => {
    const ip = nextOctets.join('.')
    onChange(withPrefix ? `${ip}/${nextPrefix}` : ip)
  }

  return (
    <div className="flex flex-nowrap items-center gap-1 overflow-x-auto">
      {octets.map((octet, index) => (
        <div key={index} className="flex shrink-0 items-center gap-1">
          <InputNumber
            value={toInputNumber(octet)}
            min={0}
            max={255}
            precision={0}
            style={{ width: 52 }}
            disabled={disabledOctets[index]}
            onChange={(next) => {
              const nextOctets = [...octets]
              nextOctets[index] = next == null ? '' : String(next)
              emit(nextOctets, prefix)
            }}
          />
          {index < 3 && <span className="text-[var(--color-text-3)]">.</span>}
        </div>
      ))}
      {withPrefix && (
        <>
          <span className="shrink-0 px-1 text-[var(--color-text-3)]">/</span>
          <InputNumber
            value={toInputNumber(prefix)}
            min={minPrefix}
            max={32}
            precision={0}
            style={{ width: 52 }}
            onChange={(next) => emit(octets, next == null ? '' : String(next))}
          />
        </>
      )}
    </div>
  )
}
