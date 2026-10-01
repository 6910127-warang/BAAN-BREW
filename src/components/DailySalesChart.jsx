import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import useIsNarrow from '../lib/useIsNarrow'
import { formatBaht, formatLongDate, formatNumber, formatShortDate } from '../lib/format'

const tick = { fontSize: 12, fill: '#1f2a2e', opacity: 0.7 }

/** ค่าเฉลี่ยเคลื่อนที่ 7 วันย้อนหลัง (วันที่ครบ 7 วันแล้วเท่านั้น) */
function withMovingAverage(daily, window = 7) {
  let sum = 0
  return daily.map((d, i) => {
    sum += d.sales
    if (i >= window) sum -= daily[i - window].sales
    return { ...d, avg7: i >= window - 1 ? Math.round((sum / window) * 100) / 100 : null }
  })
}

export default function DailySalesChart({ daily }) {
  const narrow = useIsNarrow()
  const data = withMovingAverage(daily)
  return (
    <section className="rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold">ยอดขายรายวัน</h2>
      <p className="mb-4 text-sm text-ink/60">ยอดขายรวมทุกสาขาในแต่ละวัน (฿)</p>

      <div className="h-64 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#1f2a2e" strokeOpacity={0.1} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: '#1f2a2e', strokeOpacity: 0.2 }}
              minTickGap={narrow ? 48 : 36}
            />
            <YAxis
              tickFormatter={(v) => (narrow ? `${formatNumber(v / 1000)}k` : formatNumber(v))}
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={narrow ? 40 : 72}
            />
            <Tooltip
              labelFormatter={formatLongDate}
              formatter={(value, name) => [formatBaht(value), name]}
              contentStyle={{ borderRadius: 8, border: '1px solid rgba(31,42,46,0.15)' }}
            />
            <Line
              type="monotone"
              dataKey="sales"
              name="ยอดขายรายวัน"
              stroke="#6d28d9"
              strokeOpacity={0.3}
              strokeWidth={1.25}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="avg7"
              name="เฉลี่ย 7 วัน"
              stroke="#6d28d9"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
