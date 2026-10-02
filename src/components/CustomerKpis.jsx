import { formatBaht, formatNumber } from '../lib/format'

const pct = (x) => `${(x * 100).toFixed(1)}%`

export default function CustomerKpis({ data }) {
  const items = [
    {
      label: 'สมาชิกทั้งหมด',
      value: formatNumber(data.memberCount),
      unit: `คน (ซื้อแล้ว ${formatNumber(data.buyers)} คน)`,
    },
    { label: 'ยอดขายจากสมาชิก', value: pct(data.memberShare), unit: 'ของยอดขายรวม ที่เหลือคือลูกค้าทั่วไป' },
    { label: 'ยอดซื้อเฉลี่ยต่อสมาชิก', value: formatBaht(data.avgPerBuyer), unit: 'ต่อคน (เฉพาะคนที่ซื้อ)' },
    { label: 'ซื้อที่สาขาบ้านตัวเอง', value: pct(data.homeShare), unit: 'ของยอดซื้อสมาชิก' },
  ]
  return (
    <section
      aria-label="ตัวชี้วัดสมาชิก"
      className="grid grid-cols-2 overflow-hidden rounded-lg border border-ink/15 bg-white lg:grid-cols-4"
    >
      {items.map((k, i) => (
        <div
          key={k.label}
          className={`min-w-0 p-4 sm:p-6 ${i >= 2 ? 'border-t border-ink/15 lg:border-t-0' : ''} ${
            i % 2 === 1 ? 'border-l border-ink/15' : ''
          } ${i === 2 ? 'lg:border-l lg:border-ink/15' : ''}`}
        >
          <p className="text-sm text-ink/60">{k.label}</p>
          <p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl">{k.value}</p>
          <p className="mt-1 text-sm text-ink/60">{k.unit}</p>
        </div>
      ))}
    </section>
  )
}
