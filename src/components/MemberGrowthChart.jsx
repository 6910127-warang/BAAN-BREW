import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '../lib/format'

const tick = { fontSize: 12, fill: '#1f2a2e', opacity: 0.8 }
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const monthLabel = (key) => {
  const [y, m] = key.split('-')
  return `${THAI_MONTHS[Number(m) - 1]} ${String((Number(y) + 543) % 100).padStart(2, '0')}`
}

export default function MemberGrowthChart({ joined }) {
  const hasPartial = joined.some((j) => j.partial)
  return (
    <section className="rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold">สมาชิกใหม่รายเดือน</h2>
      <p className="mb-4 text-sm text-ink/60">
        จำนวนคนที่สมัครในแต่ละเดือน{hasPartial ? ' (แท่งสีจางคือเดือนที่ข้อมูลยังไม่ครบเดือน)' : ''}
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={joined} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#1f2a2e" strokeOpacity={0.1} vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tick={tick}
              tickLine={false}
              axisLine={false}
              minTickGap={12}
            />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              cursor={{ fill: 'rgba(109,40,217,0.08)' }}
              labelFormatter={monthLabel}
              formatter={(v) => [`${formatNumber(v)} คน`, 'สมาชิกใหม่']}
              contentStyle={{ borderRadius: 8, border: '1px solid rgba(31,42,46,0.15)' }}
            />
            <Bar dataKey="members" radius={[4, 4, 0, 0]}>
              {joined.map((j) => (
                <Cell key={j.month} fill="#6d28d9" fillOpacity={j.partial ? 0.4 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
