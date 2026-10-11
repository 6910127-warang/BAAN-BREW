// Lab 4.4–4.5 · พยากรณ์ & ผิดปกติ: พยากรณ์ยอดขายรายสาขา (พร้อมย้อนทดสอบ) และวันที่ยอดขายผิดปกติ
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AuthGate from "../lab3/AuthGate.jsx";
import { BRANCHES } from "../lab3/saleModel.js";
import { toSeries } from "../lib/analytics/daily.js";
import { backtest, mape, seasonalForecast, weeklyTotals } from "../lib/analytics/forecast.js";
import { topAnomalies } from "../lib/analytics/anomaly.js";
import { formatBaht, formatNumber, formatShortDate } from "../lib/format";
import useAnalytics from "./useAnalytics.js";

const HORIZON = 28;
const HISTORY_DAYS = 56;
const WEEKS_SHOWN = 8;

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
          <ForecastSection daily={data.daily.rows} branch={branch} abcItems={data.abc.items} />
          <AnomalySection daily={data.daily.rows} holidays={data.meta.holidays ?? {}} branch={branch} />
        </>
      )}
    </div>
  );
}

function ForecastSection({ daily, branch, abcItems }) {
  const [mode, setMode] = useState("day"); // "day" | "week"
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
    // รายสัปดาห์: รวมยอดจริง/ยอดพยากรณ์เป็นจันทร์–อาทิตย์ (เฉพาะสัปดาห์ที่ครบ 7 วัน) แล้วใช้ mape() ตัวเดิม
    const wActual = weeklyTotals(series, (s) => s.revenue).slice(-WEEKS_SHOWN);
    const wForecast = weeklyTotals(forecast, (f) => f.forecast);
    const wTestActual = weeklyTotals(bt.test, (t) => t.actual);
    const wTestSeasonal = weeklyTotals(bt.test, (t) => t.seasonal);
    const wTestFlat = weeklyTotals(bt.test, (t) => t.flat);
    const act = wTestActual.map((w) => w.total);
    const weekly = {
      chart: [
        ...wActual.map((w) => ({ week: w.week, actual: w.total })),
        ...wForecast.map((w) => ({ week: w.week, forecast: w.total })),
      ],
      total: wForecast.reduce((a, w) => a + w.total, 0),
      weeks: act.length,
      mapeSeasonal: act.length ? mape(act, wTestSeasonal.map((w) => w.total)) : null,
      mapeFlat: act.length ? mape(act, wTestFlat.map((w) => w.total)) : null,
    };
    const next7Total = forecast.slice(0, STOCK_DAYS).reduce((a, f) => a + f.forecast, 0);
    const next7 = { total: next7Total, low: next7Total * (1 - bt.band), high: next7Total * (1 + bt.band), band: bt.band };
    return { chart: [...history, ...future], bt, total: forecast.reduce((a, f) => a + f.forecast, 0), weekly, next7 };
  }, [daily, branch]);

  if (!view) return <p className="rounded-lg border border-ink/15 bg-white p-4 text-ink/70">ข้อมูลของสาขานี้ยังน้อยเกินไปสำหรับพยากรณ์ (ต้องมีอย่างน้อย 12 สัปดาห์)</p>;
  const { bt, weekly } = view;
  const isWeekly = mode === "week";
  const pctText = (v) => (v == null ? "–" : `${v.toFixed(0)}%`);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-bold">พยากรณ์ยอดขาย {HORIZON} วันข้างหน้า</h2>
          <p className="text-sm text-ink/60">
            ใช้ค่าเฉลี่ยของวันเดียวกันในสัปดาห์ 8 สัปดาห์ล่าสุด
            {isWeekly
              ? " · รวมเป็นรายสัปดาห์ จันทร์–อาทิตย์ (แสดงเฉพาะสัปดาห์ที่ครบ 7 วัน)"
              : ` · ช่วงประมาณ 80% (±${(bt.band * 100).toFixed(0)}%) มาจากการย้อนทดสอบ`}
          </p>
        </div>
        <div role="group" aria-label="หน่วยเวลา" className="ml-auto flex overflow-hidden rounded-lg border border-ink/15">
          {[["day", "รายวัน"], ["week", "รายสัปดาห์"]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
              className={`px-4 py-1.5 text-sm ${mode === id ? "bg-brew text-white" : "bg-white hover:bg-ink/5"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {isWeekly ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="ยอดรวมที่พยากรณ์" value={formatBaht(weekly.total)} note={`${weekly.chart.filter((w) => w.forecast != null).length} สัปดาห์ที่ครบ`} />
          <Stat
            label="MAPE รายสัปดาห์ (ตามวันในสัปดาห์)"
            value={pctText(weekly.mapeSeasonal)}
            note={`เส้นตรง ${pctText(weekly.mapeFlat)} · ย้อนทดสอบ ${weekly.weeks} สัปดาห์`}
          />
          <Stat
            label="MAPE รายวัน (เทียบ)"
            value={pctText(bt.mapeSeasonal)}
            note={`เส้นตรง ${pctText(bt.mapeFlat)} · ย้อนทดสอบ ${HORIZON} วัน`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="ยอดรวมที่พยากรณ์" value={formatBaht(view.total)} note={`${HORIZON} วันข้างหน้า`} />
          <Stat label="ความคลาดเคลื่อนวิธีตามวันในสัปดาห์" value={`${bt.mapeSeasonal.toFixed(0)}%`} note="MAPE จากย้อนทดสอบ (ต่ำ = ดี)" />
          <Stat label="ความคลาดเคลื่อนวิธีค่าเฉลี่ยเส้นตรง" value={`${bt.mapeFlat.toFixed(0)}%`} note="ตัวเปรียบเทียบ ไม่สนวันในสัปดาห์" />
        </div>
      )}
      {isWeekly ? (
        <div className="rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly.chart} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#1f2a2e" strokeOpacity={0.1} vertical={false} />
                <XAxis dataKey="week" tickFormatter={formatShortDate} tick={{ fontSize: 12 }} tickLine={false} minTickGap={16} />
                <YAxis tickFormatter={formatNumber} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
                <Tooltip
                  labelFormatter={(w) => `สัปดาห์เริ่ม ${formatShortDate(w)}`}
                  formatter={(v, n) => [formatBaht(v), n === "actual" ? "ยอดจริง" : "พยากรณ์"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid rgba(31,42,46,0.15)" }}
                />
                <Bar dataKey="actual" fill="#1f2a2e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="forecast" fill="#6d28d9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
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
      )}
      <p className="text-sm text-ink/60">
        {isWeekly
          ? "โหมดรายสัปดาห์ไม่แสดงช่วงคาดการณ์ เพราะย้อนทดสอบได้แค่ไม่กี่สัปดาห์ น้อยเกินไปจะคำนวณช่วงที่เชื่อถือได้ ดูช่วงได้ในโหมดรายวัน"
          : `แถบช่วงคาดการณ์ (เส้นประ) คำนวณจากการย้อนทดสอบ ${HORIZON} วันล่าสุด: ซ่อนข้อมูล ${HORIZON} วันสุดท้าย พยากรณ์ด้วยวิธีเดียวกัน แล้ววัดว่าแต่ละวันคลาดเคลื่อนจากยอดจริงกี่ % (ข้ามวันที่ยอดจริงเป็น 0) จากนั้นนำส่วนเบี่ยงเบนมาตรฐานของ % ความคลาดเคลื่อนมาคูณ 1.28 ได้ ±${(bt.band * 100).toFixed(0)}% ของค่าพยากรณ์ในแต่ละวัน โดยสมมติว่าความคลาดเคลื่อนกระจายแบบระฆังคว่ำ ยอดจริงจึงควรอยู่ในช่วงนี้ราว 80% ของวัน เป็นแค่ค่าประมาณจากตัวอย่าง ${HORIZON} วัน ไม่ใช่การรับประกัน และไม่รู้เหตุการณ์พิเศษล่วงหน้า (เช่น โปรโมชันหรือไฟดับ)`}
      </p>
      <StockCard next7={view.next7} items={abcItems} branch={branch} />
    </section>
  );
}

const STOCK_DAYS = 7;
const STOCK_ROWS = 10;

// ควรเตรียมของเท่าไร: ยอดคาดการณ์ 7 วัน × สัดส่วนยอดขายของเมนูกลุ่ม A (จาก Pareto/ABC)
function StockCard({ next7, items, branch }) {
  const [showAll, setShowAll] = useState(false);
  const aItems = useMemo(() => items.filter((i) => i.cls === "A"), [items]);
  const aShare = aItems.reduce((a, i) => a + i.share, 0);
  const rows = showAll ? aItems : aItems.slice(0, STOCK_ROWS);

  return (
    <section aria-label="ควรเตรียมของเท่าไร" className="space-y-3 rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
      <div>
        <h3 className="text-lg font-semibold">ควรเตรียมของเท่าไร · {STOCK_DAYS} วันข้างหน้า</h3>
        <p className="text-sm text-ink/60">
          ยอดคาดการณ์ {STOCK_DAYS} วัน ({branch || "ทุกสาขา"}) × สัดส่วนยอดขายของเมนูกลุ่ม A ({aItems.length} เมนู รวม {(aShare * 100).toFixed(0)}% ของยอดขาย)
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label={`ยอดคาดการณ์ ${STOCK_DAYS} วัน`} value={formatBaht(next7.total)} note={`ช่วง 80%: ${formatBaht(next7.low)}–${formatBaht(next7.high)}`} />
        <Stat label="ส่วนที่มาจากเมนูกลุ่ม A" value={formatBaht(next7.total * aShare)} note={`${(aShare * 100).toFixed(0)}% ของยอดคาดการณ์`} />
        <Stat label="เตรียมไว้รองรับ (ขอบบน)" value={formatBaht(next7.high * aShare)} note="เผื่อกรณียอดสูงกว่าคาด" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-ink/60">
            <tr>
              <th className="py-2 pr-4 font-medium">เมนู</th>
              <th className="py-2 pr-4 text-right font-medium">สัดส่วนยอดขาย</th>
              <th className="py-2 pr-4 text-right font-medium">คาดว่าขายได้</th>
              <th className="py-2 text-right font-medium">เตรียมรองรับ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.product_id} className="border-t border-ink/10">
                <td className="py-2 pr-4">{i.name}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{(i.share * 100).toFixed(1)}%</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatBaht(next7.total * i.share)}</td>
                <td className="py-2 text-right tabular-nums">{formatBaht(next7.high * i.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {aItems.length > STOCK_ROWS && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm text-brew underline">
          {showAll ? `แสดงแค่ ${STOCK_ROWS} อันดับแรก` : `แสดงทั้งหมด ${aItems.length} เมนู`}
        </button>
      )}
      <p className="text-xs text-ink/60">
        ตัวเลขเป็นยอดขายเป็นบาท ไม่ใช่จำนวนชิ้น เพราะข้อมูลสรุปไม่มีราคาต่อหน่วย (นำไปหารด้วยราคาเมนูเพื่อประมาณจำนวนชิ้น) ·
        สัดส่วนเมนูคิดจากยอดขายทุกสาขารวมกัน จึงเป็นค่าประมาณสำหรับสาขาที่เลือก · ขอบบนใช้ +{(next7.band * 100).toFixed(0)}% ตามช่วง 80% ของการย้อนทดสอบ
      </p>
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
