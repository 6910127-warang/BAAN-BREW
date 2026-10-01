import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBaht, formatNumber } from '../lib/format'
import useIsNarrow from '../lib/useIsNarrow'

const tick = { fontSize: 12, fill: '#1f2a2e', opacity: 0.8 }

export default function BranchSalesChart({ branches }) {
  const narrow = useIsNarrow()
  // แท่งแนวนอน: สาขาที่ยอดสูงสุดอยู่บนสุด อ่านชื่อสาขายาว ๆ ได้ง่าย
  const height = Math.max(220, branches.length * 48 + 40)

  return (
    <section className="rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold">ยอดขายแยกสาขา</h2>
      <p className="mb-4 text-sm text-ink/60">เรียงจากมากไปน้อย (฿)</p>

      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={branches}
            layout="vertical"
            margin={{ top: 4, right: narrow ? 64 : 96, bottom: 0, left: narrow ? 0 : 8 }}
          >
            <CartesianGrid stroke="#1f2a2e" strokeOpacity={0.1} horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => (narrow ? `${formatNumber(v / 1000)}k` : formatNumber(v))}
              tickCount={narrow ? 4 : undefined}
              tick={tick}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="branch"
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={narrow ? 84 : 110}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: 'rgba(109,40,217,0.08)' }}
              formatter={(value) => [formatBaht(value), 'ยอดขาย']}
              contentStyle={{ borderRadius: 8, border: '1px solid rgba(31,42,46,0.15)' }}
            />
            <Bar dataKey="sales" fill="#6d28d9" radius={[0, 4, 4, 0]} barSize={24}>
              <LabelList
                dataKey="sales"
                position="right"
                formatter={(v) => formatBaht(v)}
                style={{ fontSize: narrow ? 11 : 12, fill: '#1f2a2e' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
