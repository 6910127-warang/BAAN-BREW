// Lab 4.5 · ใช้ Claude Code เขียนฟังก์ชันที่ยังว่าง (Prompt 4.5A ใน PROMPTS_LAB4.md) จนกว่า npm test จะผ่าน · ห้ามแก้ไฟล์ test
// Lab 4.5 · หาวันที่ยอดขายผิดปกติ
// เทียบกับ "ค่ากลางของวันเดียวกันของสัปดาห์ใน 8 สัปดาห์ก่อน" ไม่ใช่ค่าเฉลี่ย 28 วัน
// เพราะสาขาออฟฟิศกับห้างขายวันธรรมดาและเสาร์-อาทิตย์ต่างกันมาก
import { addDays } from "../../lab3/time.js";

export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

/**
 * คะแนนความผิดปกติ = ln((จริง + SMOOTH) / (คาดหวัง + SMOOTH))
 * SMOOTH กันไม่ให้วันยอดน้อย ๆ (เช่น 50 บาท เทียบ 100 บาท) ดูผิดปกติเกินจริง
 * @param daily    [{ date, branch, revenue }] จาก dailyByBranch()
 * @param holidays { "YYYY-MM-DD": "ชื่อวันหยุด" } วันหยุดจะไม่ถูกจัดอันดับ แต่ติดป้ายไว้
 * @returns ทุกวันที่คำนวณได้ เรียงจากผิดปกติมากไปน้อย:
 *   { date, branch, actual, expected, change (สัดส่วน เช่น -0.9 = ต่ำกว่าปกติ 90%), score, holiday }
 */
export function scoreAnomalies(daily, holidays = {}, { weeks = 8, minWeeks = 4, smooth = 1000 } = {}) {
  const byBranch = new Map();
  for (const d of daily) {
    const m = byBranch.get(d.branch) ?? new Map();
    m.set(d.date, (m.get(d.date) ?? 0) + d.revenue);
    byBranch.set(d.branch, m);
  }

  const out = [];
  for (const [branch, sums] of byBranch) {
    const dates = [...sums.keys()].sort();
    const last = dates[dates.length - 1];
    // วันที่ไม่มียอดระหว่างวันแรกถึงวันสุดท้ายนับเป็น 0 (ร้านเปิดแต่ขายไม่ได้ ก็คือความผิดปกติ)
    const rev = new Map();
    for (let d = dates[0]; d <= last; d = addDays(d, 1)) rev.set(d, sums.get(d) ?? 0);

    for (const [date, actual] of rev) {
      const prev = [];
      for (let k = 1; k <= weeks; k++) {
        const v = rev.get(addDays(date, -7 * k));
        if (v !== undefined) prev.push(v);
      }
      if (prev.length < minWeeks) continue;
      const expected = median(prev);
      out.push({
        date, branch, actual, expected,
        change: expected > 0 ? actual / expected - 1 : null,
        score: Math.log((actual + smooth) / (expected + smooth)),
        holiday: holidays[date] ?? null,
      });
    }
  }
  return out.sort((a, b) => Math.abs(b.score) - Math.abs(a.score) || a.date.localeCompare(b.date));
}

/** อันดับวันผิดปกติที่ควรตรวจสอบ (ไม่รวมวันหยุด) */
export function topAnomalies(daily, holidays = {}, n = 15, opts) {
  return scoreAnomalies(daily, holidays, opts).filter((a) => !a.holiday).slice(0, n);
}
