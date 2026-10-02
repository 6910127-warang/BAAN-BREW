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
import useIsNarrow from '../lib/useIsNarrow'

const tick = { fontSize: 12, fill: '#1f2a2e', opacity: 0.8 }

// แท่งแนวนอนทั่วไป: data = [{ label, value }], format = ฟังก์ชันแปลงค่าเป็นข้อความ
export default function SimpleBarChart({ title, subtitle, data, format, tooltipLabel }) {
  const narrow = useIsNarrow()
  const height = Math.max(180, data.length * 44 + 32)

  return (
    <section className="min-w-0 rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-ink/60">{subtitle}</p>
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: narrow ? 56 : 80, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke="#1f2a2e" strokeOpacity={0.1} horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={narrow ? 76 : 92}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: 'rgba(109,40,217,0.08)' }}
              formatter={(v) => [format(v), tooltipLabel]}
              contentStyle={{ borderRadius: 8, border: '1px solid rgba(31,42,46,0.15)' }}
            />
            <Bar dataKey="value" fill="#6d28d9" radius={[0, 4, 4, 0]} barSize={22}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={format}
                style={{ fontSize: 12, fill: '#1f2a2e' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
