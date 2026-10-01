import { formatBaht, formatLongDate, formatNumber } from '../lib/format'

export default function Kpis({ data }) {
  const others = [
    { label: 'จำนวนบิล', value: formatNumber(data.bills), unit: 'บิล' },
    { label: 'ยอดเฉลี่ยต่อบิล', value: formatBaht(data.avgPerBill, 2), unit: 'ต่อบิล' },
    {
      label: 'สมาชิกที่ไม่ซ้ำ',
      value: formatNumber(data.members),
      unit: 'คน (ไม่นับลูกค้าทั่วไป)',
    },
  ]

  // มือถือ/แท็บเล็ต: 2 คอลัมน์ (ยอดขายรวมเต็มแถว, สมาชิกเต็มแถวเพราะเหลือ 1 ใบ)
  // เดสก์ท็อป: 4 คอลัมน์ในแถวเดียว
  return (
    <section
      aria-label="ตัวชี้วัดหลัก"
      className="grid grid-cols-2 overflow-hidden rounded-lg border border-ink/15 bg-white lg:grid-cols-[1.5fr_1fr_1fr_1fr]"
    >
      <div className="col-span-2 bg-brew p-4 text-white sm:p-6 lg:col-span-1">
        <p className="text-sm text-white/75">ยอดขายรวม</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums sm:text-4xl lg:text-5xl">
          {formatBaht(data.totalSales)}
        </p>
        <p className="mt-3 text-sm text-white/75">
          {formatLongDate(data.firstDate)} ถึง {formatLongDate(data.lastDate)}
        </p>
      </div>

      {others.map((k, i) => (
        <div
          key={k.label}
          className={`min-w-0 border-t border-ink/15 p-4 sm:p-6 lg:border-t-0 lg:border-l ${
            i === 1 ? 'border-l' : ''
          } ${i === 2 ? 'col-span-2 lg:col-span-1' : ''}`}
        >
          <p className="text-sm text-ink/60">{k.label}</p>
          <p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl">{k.value}</p>
          <p className="mt-1 text-sm text-ink/60">{k.unit}</p>
        </div>
      ))}
    </section>
  )
}
