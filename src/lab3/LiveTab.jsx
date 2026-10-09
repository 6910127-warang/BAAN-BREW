// Lab 3.2 · Dashboard ยอดขายแบบ real-time จาก Firestore (collection "sales")
// สูตรคำนวณทั้งหมดใช้จาก ../lib/metrics.js (cleanRows + buildDashboard) ไม่เขียนซ้ำ
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, db, googleProvider, isConfigured } from "./firebase.js";
import { addDays, todayBangkok } from "./time.js";
import { BRANCHES } from "./saleModel.js";
import { buildDashboard, cleanRows } from "../lib/metrics";
import { formatBaht, formatNumber } from "../lib/format";
import SaleForm from "./SaleForm.jsx";
import Kpis from "../components/Kpis";
import DailySalesChart from "../components/DailySalesChart";
import SimpleBarChart from "../components/SimpleBarChart";

const RANGES = [
  { id: "today", label: "วันนี้", back: 0 },
  { id: "7d", label: "7 วัน", back: 6 },
  { id: "30d", label: "30 วัน", back: 29 },
];
const HIGHLIGHT_MS = 4000;
const RECENT_COUNT = 8;

const ERROR_TEXT = {
  "permission-denied": "Security Rules ไม่อนุญาตให้อ่านข้อมูลยอดขาย (ตรวจ Rules ใน Firebase Console)",
  unavailable: "เชื่อมต่อ Firestore ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่",
  unauthenticated: "ต้องเข้าสู่ระบบก่อนจึงจะอ่านข้อมูลได้",
  "failed-precondition": "Firestore ต้องการ index สำหรับ query นี้ ดูลิงก์สร้าง index ใน Console",
};
const errorMessage = (e) => ERROR_TEXT[e?.code] ?? `เกิดข้อผิดพลาด: ${e?.message ?? "ไม่ทราบสาเหตุ"}`;

const AUTH_ERROR_TEXT = {
  "auth/unauthorized-domain": "โดเมนนี้ยังไม่ได้รับอนุญาต เพิ่มโดเมนใน Firebase Console → Authentication → Settings → Authorized domains",
  "auth/operation-not-allowed": "ยังไม่ได้เปิดใช้การเข้าสู่ระบบด้วย Google ใน Firebase Console → Authentication → Sign-in method",
  "auth/configuration-not-found": "โปรเจกต์ Firebase ยังไม่ได้เริ่มใช้ Authentication ไปที่ Firebase Console → Authentication → Get started แล้วเปิด Google ใน Sign-in method",
  "auth/popup-blocked": "เบราว์เซอร์บล็อกหน้าต่างล็อกอิน กรุณาอนุญาต pop-up แล้วลองใหม่",
  "auth/popup-closed-by-user": "ปิดหน้าต่างล็อกอินก่อนเสร็จสิ้น ลองใหม่อีกครั้ง",
};
const authErrorMessage = (e) => AUTH_ERROR_TEXT[e?.code] ?? `เข้าสู่ระบบไม่สำเร็จ: ${e?.message ?? "ไม่ทราบสาเหตุ"}`;

// ด่านล็อกอิน: ยังไม่ล็อกอินจะไม่ render Dashboard (จึงไม่เริ่ม onSnapshot)
export default function LiveTab() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
  }, []);

  async function handleSignIn() {
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setAuthError(authErrorMessage(e));
    }
  }

  async function handleSignOut() {
    setAuthError("");
    try {
      await signOut(auth);
    } catch (e) {
      setAuthError(authErrorMessage(e));
    }
  }

  if (!isConfigured) {
    return (
      <div className="rounded-lg border border-ink/15 bg-white p-6">
        <p className="text-red-700">❌ ยังไม่ได้ตั้งค่า Firebase ใน .env (ดู .env.example)</p>
      </div>
    );
  }

  if (checking) return <p className="text-ink/60">กำลังตรวจสอบการเข้าสู่ระบบ…</p>;

  if (!user) {
    return (
      <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-ink/15 bg-white p-6 text-center">
        <h1 className="text-xl font-bold">ยอดขายสด</h1>
        <p className="text-sm text-ink/70">เข้าสู่ระบบเพื่อดู Dashboard และบันทึกยอดขาย</p>
        <button type="button" onClick={handleSignIn} className="w-full rounded-lg bg-brew px-4 py-2 text-sm text-white">
          เข้าสู่ระบบด้วย Google
        </button>
        {authError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-700">❌ {authError}</p>}
      </div>
    );
  }

  return <LiveDashboard user={user} onSignOut={handleSignOut} authError={authError} />;
}

function LiveDashboard({ user, onSignOut, authError }) {
  const [rangeId, setRangeId] = useState("7d");
  const [branch, setBranch] = useState("");
  const [docs, setDocs] = useState([]); // [{ id, ...data }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readCount, setReadCount] = useState(0);
  const [fresh, setFresh] = useState(() => new Set());
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState("");
  const timers = useRef(new Set());

  // โหลดเมนูครั้งเดียวสำหรับฟอร์มบันทึกยอดขาย
  useEffect(() => {
    if (!db) return;
    getDocs(collection(db, "products"))
      .then((snap) => setProducts(snap.docs.map((d) => d.data())))
      .catch((e) => setProductsError(errorMessage(e)));
  }, []);

  useEffect(() => {
    if (!db) return undefined;
    const { back } = RANGES.find((r) => r.id === rangeId);
    const end = todayBangkok();
    const start = addDays(end, -back);

    const byId = new Map();
    let first = true;
    setLoading(true);
    setError("");
    setDocs([]);
    setFresh(new Set());

    const q = query(
      collection(db, "sales"),
      where("date", ">=", start),
      where("date", "<=", end),
      orderBy("date"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const changes = snap.docChanges();
        const added = [];
        for (const c of changes) {
          if (c.type === "removed") byId.delete(c.doc.id);
          else byId.set(c.doc.id, { id: c.doc.id, ...c.doc.data() });
          if (c.type === "added") added.push(c.doc.id);
        }
        setReadCount((n) => n + changes.length);
        setDocs([...byId.values()]);
        setLoading(false);

        // ไฮไลต์เฉพาะรายการที่เข้ามาหลัง snapshot แรก
        if (!first && added.length > 0) {
          setFresh((prev) => new Set([...prev, ...added]));
          const t = setTimeout(() => {
            timers.current.delete(t);
            setFresh((prev) => {
              const next = new Set(prev);
              added.forEach((id) => next.delete(id));
              return next;
            });
          }, HIGHLIGHT_MS);
          timers.current.add(t);
        }
        first = false;
      },
      (e) => {
        setError(errorMessage(e));
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    };
  }, [rangeId]);

  // กรองสาขาฝั่งเบราว์เซอร์
  const visible = useMemo(() => (branch ? docs.filter((d) => d.branch === branch) : docs), [docs, branch]);
  const dashboard = useMemo(() => buildDashboard(cleanRows(visible).rows), [visible]);
  const hourly = useMemo(() => {
    const sums = Array.from({ length: 24 }, (_, hour) => ({ hour, sales: 0 }));
    for (const d of visible) {
      const h = Number(d.hour);
      if (h >= 0 && h < 24) sums[h].sales += Number(d.qty) * Number(d.unit_price);
    }
    return sums;
  }, [visible]);
  const recent = useMemo(
    () => [...visible].sort((a, b) => String(b.datetime).localeCompare(String(a.datetime))).slice(0, RECENT_COUNT),
    [visible],
  );

  const isToday = rangeId === "today";
  const empty = !loading && !error && visible.length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">ยอดขายสด</h1>
        <div className="order-last flex items-center gap-2 text-sm">
          {user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />}
          <span className="max-w-[10rem] truncate">{user.displayName ?? user.email}</span>
          <button type="button" onClick={onSignOut} className="rounded-lg border border-ink/15 bg-white px-3 py-1 hover:bg-ink/5">
            ออกจากระบบ
          </button>
        </div>
        <div role="group" aria-label="ช่วงเวลา" className="flex overflow-hidden rounded-lg border border-ink/15">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={rangeId === r.id}
              onClick={() => setRangeId(r.id)}
              className={`px-4 py-1.5 text-sm ${rangeId === r.id ? "bg-brew text-white" : "bg-white hover:bg-ink/5"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <select
          aria-label="สาขา"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">ทุกสาขา</option>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-ink/60">อ่านข้อมูลแล้ว {formatNumber(readCount)} เอกสาร</span>
      </div>

      {authError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">❌ {authError}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">❌ {error}</p>}
      {loading && !error && <p className="text-ink/60">กำลังโหลดข้อมูล…</p>}
      {empty && <p className="rounded-lg border border-ink/15 bg-white p-4 text-ink/70">ยังไม่มียอดขายในช่วงนี้</p>}

      {!loading && !error && visible.length > 0 && (
        <>
          <Kpis data={dashboard} />

          {isToday ? (
            <section className="rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
              <h2 className="text-lg font-semibold">ยอดขายรายชั่วโมง</h2>
              <p className="mb-4 text-sm text-ink/60">ยอดขายวันนี้แยกตามชั่วโมง (฿)</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourly} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#1f2a2e" strokeOpacity={0.1} vertical={false} />
                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 12 }} tickLine={false} interval={2} />
                    <YAxis tickFormatter={formatNumber} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
                    <Tooltip
                      labelFormatter={(h) => `${h}:00 น.`}
                      formatter={(v) => [formatBaht(v), "ยอดขาย"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid rgba(31,42,46,0.15)" }}
                    />
                    <Bar dataKey="sales" fill="#6d28d9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : (
            <DailySalesChart daily={dashboard.daily} />
          )}

          {!branch && (
            <SimpleBarChart
              title="ยอดขายแยกสาขา"
              subtitle="ยอดขายรวมของแต่ละสาขาในช่วงที่เลือก (฿)"
              data={dashboard.branches.map((b) => ({ label: b.branch, value: b.sales }))}
              format={formatBaht}
              tooltipLabel="ยอดขาย"
            />
          )}

          <section className="rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold">รายการล่าสุด</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-ink/60">
                  <tr>
                    <th className="py-2 pr-4 font-medium">เวลา</th>
                    <th className="py-2 pr-4 font-medium">บิล</th>
                    <th className="py-2 pr-4 font-medium">สาขา</th>
                    <th className="py-2 pr-4 font-medium">เมนู</th>
                    <th className="py-2 pr-4 text-right font-medium">จำนวน</th>
                    <th className="py-2 text-right font-medium">ยอด</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((d) => (
                    <tr
                      key={d.id}
                      className={`border-t border-ink/10 transition-colors duration-500 ${fresh.has(d.id) ? "bg-amber-100" : ""}`}
                    >
                      <td className="py-2 pr-4 tabular-nums">{String(d.datetime).slice(0, 16).replace("T", " ")}</td>
                      <td className="py-2 pr-4">{d.order_id}</td>
                      <td className="py-2 pr-4">{d.branch}</td>
                      <td className="py-2 pr-4">{d.product_id}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(d.qty)}</td>
                      <td className="py-2 text-right tabular-nums">{formatBaht(Number(d.qty) * Number(d.unit_price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
    <aside className="lg:sticky lg:top-4">
      {productsError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">❌ โหลดเมนูไม่สำเร็จ: {productsError}</p>
      ) : (
        <SaleForm products={products} uid={user.uid} />
      )}
    </aside>
    </div>
  );
}
