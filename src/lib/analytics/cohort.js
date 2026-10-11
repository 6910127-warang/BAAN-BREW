// Lab 4.2 · ใช้ Claude Code เขียนฟังก์ชันที่ยังว่าง (Prompt 4.2A ใน PROMPTS_LAB4.md) จนกว่า npm test จะผ่าน · ห้ามแก้ไฟล์ test
// Lab 4.2 · Cohort retention รายเดือน
// cohort = เดือนแรกที่ลูกค้าสมาชิกซื้อ · retention[k] = สัดส่วนลูกค้าใน cohort ที่กลับมาซื้อในเดือนที่ k (k=0 คือเดือนแรก = 100%)

/** จำนวนเดือนจาก a ถึง b เช่น monthIndex("2025-11", "2026-02") = 3 */
export function monthIndex(a, b) {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

function addMonths(ym, k) {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + k;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/**
 * @param rows  แถวยอดขาย (ไม่นับ customer_id ว่าง)
 * @param asOf  วันสุดท้ายของข้อมูล YYYY-MM-DD ใช้บอกว่าเดือนสุดท้ายข้อมูลไม่ครบหรือไม่
 * @returns {{ cohorts: {cohort, size, retention: number[]}[], lastMonth, lastMonthPartial, daysInLastMonth }}
 *   retention ยาวเท่าจำนวนเดือนที่สังเกตได้ของ cohort นั้น (ถึง lastMonth)
 */
export function computeCohorts(rows, asOf) {
  const lastMonth = asOf.slice(0, 7);
  const [y, m] = lastMonth.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const daysInLastMonth = Number(asOf.slice(8, 10));

  const months = new Map(); // customer_id → Set ของเดือนที่ซื้อ
  for (const x of rows) {
    if (!x.customer_id) continue;
    const set = months.get(x.customer_id) ?? new Set();
    set.add(x.date.slice(0, 7));
    months.set(x.customer_id, set);
  }

  const byCohort = new Map(); // เดือนแรก → เดือนที่ซื้อของลูกค้าแต่ละคนใน cohort นั้น
  for (const set of months.values()) {
    const first = [...set].sort()[0];
    const list = byCohort.get(first) ?? [];
    list.push(set);
    byCohort.set(first, list);
  }

  const cohorts = [...byCohort.keys()].sort().map((cohort) => {
    const list = byCohort.get(cohort);
    const span = monthIndex(cohort, lastMonth);
    const retention = Array.from({ length: span + 1 }, (_, k) => {
      const target = addMonths(cohort, k);
      return list.filter((set) => set.has(target)).length / list.length;
    });
    return { cohort, size: list.length, retention };
  });

  return { cohorts, lastMonth, lastMonthPartial: daysInLastMonth < daysInMonth, daysInLastMonth };
}
