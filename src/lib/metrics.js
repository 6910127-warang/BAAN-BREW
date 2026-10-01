// logic คำนวณทั้งหมดของ Dashboard อยู่ในไฟล์นี้ (ไม่มี React / UI)
// 1 แถวใน CSV = 1 รายการสินค้า, 1 บิล (order_id) มีได้หลายแถว

const THAI_OFFSET_MS = 7 * 60 * 60 * 1000 // UTC+7

// คอลัมน์ที่ Dashboard ต้องใช้คำนวณ
export const REQUIRED_COLUMNS = [
  'order_id',
  'datetime',
  'branch',
  'qty',
  'unit_price',
  'customer_id',
]

/** ล้าง BOM และช่องว่างในชื่อคอลัมน์ ใช้เป็น transformHeader ของ PapaParse */
export const cleanHeader = (h) => String(h ?? '').replace(/^\uFEFF/, '').trim()

/** คืนรายชื่อคอลัมน์ที่จำเป็นแต่ไม่พบในไฟล์ */
export function findMissingColumns(fields) {
  return REQUIRED_COLUMNS.filter((c) => !fields.includes(c))
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

/** แปลงข้อความเป็นตัวเลข (ตัดจุลภาคออก) ถ้าว่างหรืออ่านไม่ได้คืน NaN */
function toNumber(value) {
  const s = String(value ?? '').replace(/,/g, '').trim()
  return s === '' ? NaN : Number(s)
}

/**
 * แปลง datetime เป็น "วันที่ตามเวลาไทย" รูปแบบ YYYY-MM-DD
 * วิธีคิด: อ่านเวลาเป็น timestamp (รวม offset เดิมแล้ว) → บวก 7 ชั่วโมง → ตัดเอาส่วนวันที่
 * ทำให้บิลเวลา 00:30+07:00 ถูกนับเป็นวันใหม่ของไทยเสมอ ไม่ว่าเบราว์เซอร์ตั้งเขตเวลาอะไร
 */
export function toThaiDateKey(value) {
  const t = new Date(String(value ?? '').trim()).getTime()
  if (Number.isNaN(t)) return null
  return new Date(t + THAI_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * แปลงแถวดิบจาก PapaParse เป็นแถวที่พร้อมคำนวณ
 * - lineTotal = qty × unit_price (ยอดขายของรายการนั้น)
 * - customer_id ว่าง → customerId = null (ลูกค้าทั่วไป ไม่ใช่สมาชิก)
 * - ข้ามแถวที่ไม่มี order_id, วันที่อ่านไม่ได้ หรือ qty / unit_price ไม่ใช่ตัวเลข
 */
export function cleanRows(rawRows) {
  const rows = []
  let skipped = 0

  for (const r of rawRows) {
    const orderId = String(r.order_id ?? '').trim()
    const date = toThaiDateKey(r.datetime)
    const qty = toNumber(r.qty)
    const unitPrice = toNumber(r.unit_price)

    if (!orderId || !date || !Number.isFinite(qty) || !Number.isFinite(unitPrice)) {
      skipped += 1
      continue
    }

    const customerId = String(r.customer_id ?? '').trim()
    rows.push({
      orderId,
      date,
      branch: String(r.branch ?? '').trim() || 'ไม่ระบุสาขา',
      lineTotal: qty * unitPrice,
      customerId: customerId || null,
    })
  }
  return { rows, skipped }
}

/** ยอดขายรวม = ผลรวมของ lineTotal ทุกแถว */
export function totalSales(rows) {
  return round2(rows.reduce((sum, r) => sum + r.lineTotal, 0))
}

/** จำนวนบิล = จำนวน order_id ที่ไม่ซ้ำกัน (ไม่ใช่จำนวนแถว) */
export function countBills(rows) {
  return new Set(rows.map((r) => r.orderId)).size
}

/** ยอดเฉลี่ยต่อบิล = ยอดขายรวม ÷ จำนวนบิล (ถ้าไม่มีบิลคืน 0) */
export function averagePerBill(rows) {
  const bills = countBills(rows)
  return bills === 0 ? 0 : round2(totalSales(rows) / bills)
}

/** จำนวนสมาชิกที่ไม่ซ้ำ = จำนวน customer_id ที่ไม่ว่างและไม่ซ้ำกัน */
export function countMembers(rows) {
  return new Set(rows.filter((r) => r.customerId).map((r) => r.customerId)).size
}

/**
 * ยอดขายรายวัน: รวม lineTotal ตามวันที่ (เวลาไทย) แล้วเรียงตามวัน
 * วันที่ไม่มียอดขายระหว่างวันแรกถึงวันสุดท้ายจะเติมเป็น 0
 * เพื่อให้เส้นกราฟไม่ลากข้ามช่องว่างจนดูเหมือนยอดไม่ตก
 */
export function dailySales(rows) {
  if (rows.length === 0) return []

  const byDate = new Map()
  for (const r of rows) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.lineTotal)

  const keys = [...byDate.keys()].sort()
  const cursor = new Date(`${keys[0]}T00:00:00Z`)
  const end = new Date(`${keys[keys.length - 1]}T00:00:00Z`)
  const result = []

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    result.push({ date: key, sales: round2(byDate.get(key) ?? 0) })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return result
}

/** ยอดขายแยกสาขา: รวม lineTotal ตาม branch แล้วเรียงจากมากไปน้อย */
export function salesByBranch(rows) {
  const byBranch = new Map()
  for (const r of rows) byBranch.set(r.branch, (byBranch.get(r.branch) ?? 0) + r.lineTotal)

  return [...byBranch.entries()]
    .map(([branch, sales]) => ({ branch, sales: round2(sales) }))
    .sort((a, b) => b.sales - a.sales || a.branch.localeCompare(b.branch, 'th'))
}

/** รวมทุกค่าที่หน้า Dashboard ต้องใช้ ให้คำนวณครั้งเดียวตอนโหลดไฟล์ */
export function buildDashboard(rows) {
  const daily = dailySales(rows)
  return {
    totalSales: totalSales(rows),
    bills: countBills(rows),
    avgPerBill: averagePerBill(rows),
    members: countMembers(rows),
    daily,
    branches: salesByBranch(rows),
    firstDate: daily[0]?.date ?? null,
    lastDate: daily[daily.length - 1]?.date ?? null,
  }
}
