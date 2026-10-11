// Lab 4.4–4.5 · พยากรณ์ & ผิดปกติ: พยากรณ์ยอดขายรายสาขา (พร้อมย้อนทดสอบ) และวันที่ยอดขายผิดปกติ
import { useMemo, useState } from "react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AuthGate from "../lab3/AuthGate.jsx";
import { BRANCHES } from "../lab3/saleModel.js";
import { toSeries } from "../lib/analytics/daily.js";
import { backtest, seasonalForecast } from "../lib/analytics/forecast.js";
import { topAnomalies } from "../lib/analytics/anomaly.js";
import { formatBaht, formatNumber, formatShortDate } from "../lib/format";
import useAnalytics from "./useAnalytics.js";

const HORIZON = 28;
const HISTORY_DAYS = 56;

export default function ForecastTab() {
  return (
    <AuthGate title="พยากรณ์ & ผิดปกติ">
      {(user, signOutButton) => <ForecastView signOutButton={signOutButton} />}
    </AuthGate>
  );
}

function ForecastView({ signOutButton }) {
  const { data, error, loading } = useAnalytics();
  const [branch, setBranch] = useState("");

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">พยากรณ์ &amp; ผิดปกติ</h1>
        <select
          aria-label="สาขา"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">ทุกสาขา</option>
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <div className="ml-auto">{signOutButton}</div>
      </div>
      {loading && <p className="text-ink/60">กำลังโหลดข้อมูลวิเคราะห์…</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">❌ {error}</p>}
      {data && (
        <>
          <ForecastSection daily={data.daily.rows} branch={branch} />
          <AnomalySection daily={data.daily.rows} holidays={data.meta.holidays ?? {}} branch={branch} />
        </>
      )}
    </div>
  );
}

function ForecastSection({ daily, branch }) {
  const view = useMemo(() => {
    const series = toSeries(daily, branch || null);
    if (series.length < HORIZON + 8 * 7) return null;
    const bt = backtest(series, HORIZON);
    const forecast = seasonalForecast(series, HORIZON);
    const history = series.slice(-HISTORY_DAYS).map((s) => ({ date: s.date, actual: s.revenue }));
    const future = forecast.map((f) => ({
      date: f.date,
      forecast: f.forecast,
      low: f.forecast * (1 - bt.band),
      high: f.forecast * (1 + bt.band),
    }));
    // ต่อเส้นพยากรณ์จากวันสุดท้ายของข้อมูลจริง
    const last = history[history.length - 1];
    history[history.length - 1] = { ...last, forecast: last.actual };
    return { chart: [...history, ...future], bt, total: forecast.reduce((a, f) => a + f.forecast, 0) };
  }, [daily, branch]);

  if (!view) return <p className="rounded-lg border border-ink/15 bg-white p-4 text-ink/70">ข้อมูลของสาขานี้ยังน้อยเกินไปสำหรับพยากรณ์ (ต้องมีอย่างน้อย 12 สัปดาห์)</p>;
  const { bt } = view;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">พยากรณ์ยอดขาย {HORIZON} วันข้างหน้า</h2>
        <p className="text-sm text-ink/60">
          ใช้ค่าเฉลี่ยของวันเดียวกันในสัปดาห์ 8 สัปดาห์ล่าสุด · ช่วงประมาณ 80% (±{(bt.band * 100).toFixed(0)}%) มาจากการย้อนทดสอบ
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="ยอดรวมที่พยากรณ์" value={formatBaht(view.total)} note={`${HORIZON} วันข้างหน้า`} />
        <Stat label="ความคลาดเคลื่อนวิธีตามวันในสัปดาห์" value={`${bt.mapeSeasonal.toFixed(0)}%`} note="MAPE จากย้อนทดสอบ (ต่ำ = ดี)" />
        <Stat label="ความคลาดเคลื่อนวิธีค่าเฉลี่ยเส้นตรง" value={`${bt.mapeFlat.toFixed(0)}%`} note="ตัวเปรียบเทียบ ไม่สนวันในสัปดาห์" />
      </div>
      <div className="rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={view.chart} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#1f2a2e" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 12 }} tickLine={false} minTickGap={32} />
              <YAxis tickFormatter={formatNumber} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
              <Tooltip
                labelFormatter={formatShortDate}
                formatter={(v, n) => [formatBaht(v), { actual: "ยอดจริง", forecast: "พยากรณ์", low: "ต่ำสุด (80%)", high: "สูงสุด (80%)" }[n]]}
                contentStyle={{ borderRadius: 8, border: "1px solid rgba(31,42,46,0.15)" }}
              />
              <Line dataKey="actual" stroke="#1f2a2e" strokeWidth={2} dot={false} connectNulls={false} />
              <Line dataKey="high" stroke="#6d28d9" strokeOpacity={0.35} strokeDasharray="4 4" dot={false} />
              <Line dataKey="low" stroke="#6d28d9" strokeOpacity={0.35} strokeDasharray="4 4" dot={false} />
              <Line dataKey="forecast" stroke="#6d28d9" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="rounded-lg border border-ink/15 bg-white p-4">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-ink/60">{note}</p>
    </div>
  );
}

function AnomalySection({ daily, holidays, branch }) {
  const rows = useMemo(
    () => topAnomalies(branch ? daily.filter((d) => d.branch === branch) : daily, holidays, 15),
    [daily, holidays, branch],
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">วันที่ยอดขายผิดปกติ</h2>
        <p className="text-sm text-ink/60">
          เทียบกับค่ากลางของวันเดียวกันในสัปดาห์ 8 สัปดาห์ก่อน (ไม่รวมวันหยุดราชการ) · เรียงจากผิดปกติมากไปน้อย
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
        <table className="w-full text-left text-sm">
          <thead className="text-ink/60">
            <tr>
              <th className="py-2 pr-4 font-medium">วันที่</th>
              <th className="py-2 pr-4 font-medium">สาขา</th>
              <th className="py-2 pr-4 text-right font-medium">ยอดจริง</th>
              <th className="py-2 pr-4 text-right font-medium">คาดหวัง</th>
              <th className="py-2 text-right font-medium">เปลี่ยนแปลง</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={`${a.date}-${a.branch}`} className="border-t border-ink/10">
                <td className="py-2 pr-4 tabular-nums">{a.date}</td>
                <td className="py-2 pr-4">{a.branch}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatBaht(a.actual)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatBaht(a.expected)}</td>
                <td className={`py-2 text-right tabular-nums ${a.score < 0 ? "text-red-700" : "text-green-700"}`}>
                  {a.change == null ? "–" : `${a.change > 0 ? "+" : ""}${(a.change * 100).toFixed(0)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
