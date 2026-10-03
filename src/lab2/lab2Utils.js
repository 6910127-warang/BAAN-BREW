// ตัวช่วยสำหรับแท็บ Lab 2.2 (ย้ายมาจาก lib/metrics.js ของ student pack)

/** แปลงแถวที่ cleanRows() ทำแล้ว เป็นรูปแบบที่กราฟ Lab 2.2 ใช้ */
export const toLab2Rows = (rows) =>
  rows.map((r) => ({
    order_id: r.orderId,
    date: r.date,
    branch: r.branch,
    product_id: r.productId,
    revenue: r.lineTotal,
  }))

/** ยอดขายรวมรายวัน เรียงตามวันที่ */
export function dailyRevenue(rows) {
  const map = new Map()
  for (const r of rows) map.set(r.date, (map.get(r.date) ?? 0) + r.revenue)
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }))
}

export const fmtBaht = (n) => '฿' + n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
export const fmtShortBaht = (n) =>
  n >= 1_000_000 ? `฿${(n / 1_000_000).toFixed(1)} ล.` : n >= 1000 ? `฿${(n / 1000).toFixed(0)}k` : `฿${n}`
