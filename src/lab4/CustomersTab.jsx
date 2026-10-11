// Lab 4.1–4.3 · ลูกค้า & เมนู: RFM, Cohort retention, Pareto/ABC (อ่านจาก analytics ที่คำนวณไว้แล้ว)
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AuthGate from "../lab3/AuthGate.jsx";
import SimpleBarChart from "../components/SimpleBarChart";
import { SEGMENTS } from "../lib/analytics/rfm.js";
import { formatBaht, formatNumber } from "../lib/format";
import useAnalytics from "./useAnalytics.js";

const pct = (x, digits = 0) => `${(x * 100).toFixed(digits)}%`;
const CLS_STYLE = { A: "bg-brew text-white", B: "bg-amber-200 text-ink", C: "bg-ink/10 text-ink/70" };

export default function CustomersTab() {
  return (
    <AuthGate title="ลูกค้า & เมนู">
      {(user, signOutButton) => <CustomersView signOutButton={signOutButton} />}
    </AuthGate>
  );
}

function CustomersView({ signOutButton }) {
  const { data, error, loading } = useAnalytics();

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">ลูกค้า &amp; เมนู</h1>
        <div className="ml-auto">{signOutButton}</div>
      </div>
      {loading && <p className="text-ink/60">กำลังโหลดข้อมูลวิเคราะห์…</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">❌ {error}</p>}
      {data && (
        <>
          <p className="text-sm text-ink/60">
            ข้อมูลถึงวันที่ {data.meta.asOf} · {formatNumber(data.meta.bills)} บิล · สมาชิก {formatNumber(data.meta.members)} คน
          </p>
          <RfmSection rfm={data.rfm} />
          <CohortSection cohort={data.cohort} />
          <AbcSection items={data.abc.items} />
        </>
      )}
    </div>
  );
}

const PICKED_LIMIT = 15;

// CSV ใส่ BOM ให้ Excel อ่านภาษาไทยถูก · ครอบค่าที่มีจุลภาคหรือเครื่องหมายคำพูดด้วยเครื่องหมายคำพูด
function downloadCsv(filename, header, rows) {
  const cell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const text = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SegmentCard({ segment, customers, onClose }) {
  const members = useMemo(() => customers.filter((c) => c.segment === segment.id).sort((a, b) => b.M - a.M), [customers, segment.id]);

  function handleDownload() {
    downloadCsv(
      `rfm-${segment.id.replace(/\s+/g, "-").toLowerCase()}.csv`,
      ["customer_id", "ไม่ได้มา (วัน)", "จำนวนบิล", "ยอดซื้อรวม", "R", "F", "M", "กลุ่ม"],
      members.map((c) => [c.id, c.R, c.F, c.M, c.r, c.f, c.m, c.segment]),
    );
  }

  return (
    <section aria-label={`รายชื่อลูกค้ากลุ่ม ${segment.th}`} className="rounded-lg border-2 border-brew bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">{segment.th} <span className="text-ink/50">({segment.id})</span></h3>
          <p className="text-sm text-ink/60">
            {formatNumber(members.length)} คน · แสดง {Math.min(PICKED_LIMIT, members.length)} คนแรกที่ยอดซื้อสูงสุด · ควรทำ: {segment.action}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={handleDownload} className="rounded-lg bg-brew px-3 py-1.5 text-sm text-white">
            ดาวน์โหลด CSV
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm hover:bg-ink/5">
            ปิด
          </button>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-ink/60">
            <tr>
              <th className="py-2 pr-4 font-medium">รหัส</th>
              <th className="py-2 pr-4 text-right font-medium">ไม่ได้มา (วัน)</th>
              <th className="py-2 pr-4 text-right font-medium">บิล</th>
              <th className="py-2 pr-4 text-right font-medium">ยอดซื้อ</th>
              <th className="py-2 text-center font-medium">R-F-M</th>
            </tr>
          </thead>
          <tbody>
            {members.slice(0, PICKED_LIMIT).map((c) => (
              <tr key={c.id} className="border-t border-ink/10">
                <td className="py-2 pr-4">{c.id}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(c.R)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(c.F)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatBaht(c.M)}</td>
                <td className="py-2 text-center tabular-nums">{c.r}-{c.f}-{c.m}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RfmSection({ rfm }) {
  const [picked, setPicked] = useState(null); // id ของกลุ่มที่คลิก (null = ไม่มี)
  const th = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]));
  const toggle = (id) => setPicked((cur) => (cur === id || !id ? null : id));
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">RFM · กลุ่มลูกค้าสมาชิก</h2>
        <p className="text-sm text-ink/60">แบ่งตามความใหม่ (R) ความถี่ (F) และยอดซื้อ (M) ของสมาชิกแต่ละคน</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SimpleBarChart
          title="จำนวนสมาชิกแต่ละกลุ่ม"
          subtitle="คน"
          data={rfm.segments.map((s) => ({ id: s.segment, label: th[s.segment].th, value: s.customers }))}
          format={formatNumber}
          tooltipLabel="สมาชิก"
          onSelect={toggle}
          selectedId={picked}
        />
        <SimpleBarChart
          title="สัดส่วนยอดขายของแต่ละกลุ่ม"
          subtitle="% ของยอดซื้อสมาชิกทั้งหมด · คลิกแท่งเพื่อดูรายชื่อ"
          data={rfm.segments.map((s) => ({ id: s.segment, label: th[s.segment].th, value: s.revenueShare * 100 }))}
          format={(v) => `${v.toFixed(0)}%`}
          tooltipLabel="สัดส่วนยอด"
          onSelect={toggle}
          selectedId={picked}
        />
      </div>
      {picked && <SegmentCard segment={th[picked]} customers={rfm.customers} onClose={() => setPicked(null)} />}
      <div className="overflow-x-auto rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
        <table className="w-full text-left text-sm">
          <thead className="text-ink/60">
            <tr>
              <th className="py-2 pr-4 font-medium">กลุ่ม</th>
              <th className="py-2 pr-4 text-right font-medium">คน</th>
              <th className="py-2 pr-4 text-right font-medium">ยอดรวม</th>
              <th className="py-2 pr-4 font-medium">ควรทำ</th>
            </tr>
          </thead>
          <tbody>
            {rfm.segments.map((s) => (
              <tr
                key={s.segment}
                onClick={() => toggle(s.segment)}
                className={`cursor-pointer border-t border-ink/10 hover:bg-ink/5 ${picked === s.segment ? "bg-amber-100" : ""}`}
              >
                <td className="py-2 pr-4">
                  <button type="button" aria-pressed={picked === s.segment} className="text-left">
                    {th[s.segment].th} <span className="text-ink/50">({s.segment})</span>
                  </button>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(s.customers)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatBaht(s.revenue)} ({pct(s.revenueShare)})</td>
                <td className="py-2 pr-4">{th[s.segment].action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// สีเข้มขึ้นตาม retention (0–100%)
const heat = (v) => ({ backgroundColor: `rgba(109, 40, 217, ${0.08 + 0.8 * v})`, color: v > 0.5 ? "#fff" : undefined });

function CohortSection({ cohort }) {
  const width = Math.max(...cohort.cohorts.map((c) => c.retention.length));
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">Cohort · สมาชิกกลับมาซื้อซ้ำ</h2>
        <p className="text-sm text-ink/60">
          แถว = เดือนที่ซื้อครั้งแรก · คอลัมน์ = กลับมาซื้ออีกกี่เดือนต่อมา
          {cohort.lastMonthPartial && ` · เดือน ${cohort.lastMonth} มีข้อมูลแค่ ${cohort.daysInLastMonth} วัน ตัวเลขช่องสุดท้ายของแต่ละแถวจึงต่ำกว่าจริง`}
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
        <table className="w-full border-separate border-spacing-1 text-center text-xs sm:text-sm">
          <thead className="text-ink/60">
            <tr>
              <th className="text-left font-medium">เดือนแรก</th>
              <th className="font-medium">คน</th>
              {Array.from({ length: width }, (_, k) => <th key={k} className="font-medium">+{k}</th>)}
            </tr>
          </thead>
          <tbody>
            {cohort.cohorts.map((c) => (
              <tr key={c.cohort}>
                <td className="whitespace-nowrap text-left">{c.cohort}</td>
                <td className="tabular-nums">{formatNumber(c.size)}</td>
                {c.retention.map((v, k) => (
                  <td key={k} className="rounded px-1 py-1 tabular-nums" style={heat(v)}>{pct(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AbcSection({ items }) {
  const [showAll, setShowAll] = useState(false);
  const counts = useMemo(() => {
    const c = { A: 0, B: 0, C: 0 };
    for (const i of items) c[i.cls] += 1;
    return c;
  }, [items]);
  const chart = items.map((i) => ({ name: i.name, revenue: i.revenue, cum: i.cumShare * 100 }));
  const rows = showAll ? items : items.slice(0, 10);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">Pareto / ABC · เมนู</h2>
        <p className="text-sm text-ink/60">
          A = เมนูที่รวมกันได้ 80% แรกของยอดขาย ({counts.A} เมนู) · B = ถึง 95% ({counts.B}) · C = ที่เหลือ ({counts.C})
        </p>
      </div>
      <div className="rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#1f2a2e" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis yAxisId="rev" tickFormatter={formatNumber} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
              <YAxis yAxisId="cum" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                formatter={(v, n) => (n === "cum" ? [`${v.toFixed(1)}%`, "ยอดสะสม"] : [formatBaht(v), "ยอดขาย"])}
                contentStyle={{ borderRadius: 8, border: "1px solid rgba(31,42,46,0.15)" }}
              />
              <Bar yAxisId="rev" dataKey="revenue" fill="#6d28d9" />
              <Line yAxisId="cum" dataKey="cum" stroke="#b45309" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink/60">
              <tr>
                <th className="py-2 pr-4 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">เมนู</th>
                <th className="py-2 pr-4 font-medium">หมวด</th>
                <th className="py-2 pr-4 text-right font-medium">ยอดขาย</th>
                <th className="py-2 pr-4 text-right font-medium">สะสม</th>
                <th className="py-2 font-medium">กลุ่ม</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.product_id} className="border-t border-ink/10">
                  <td className="py-2 pr-4 tabular-nums">{i.rank}</td>
                  <td className="py-2 pr-4">{i.name}</td>
                  <td className="py-2 pr-4">{i.category}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatBaht(i.revenue)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{pct(i.cumShare, 1)}</td>
                  <td className="py-2"><span className={`rounded px-2 py-0.5 text-xs ${CLS_STYLE[i.cls]}`}>{i.cls}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length > 10 && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm text-brew underline">
            {showAll ? "แสดงแค่ 10 อันดับแรก" : `แสดงทั้งหมด ${items.length} เมนู`}
          </button>
        )}
      </div>
    </section>
  );
}
