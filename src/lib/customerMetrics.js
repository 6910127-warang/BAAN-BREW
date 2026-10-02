// logic ฝั่งสมาชิก: อ่าน customers.csv / branches.csv แล้ว join กับแถวขายที่ cleanRows ทำไว้แล้ว (ไม่มี React / UI)

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

export const AGE_ORDER = ['ต่ำกว่า 18', '18-24', '25-34', '35-44', '45-54', '55+']
export const GENDER_ORDER = ['หญิง', 'ชาย', 'ไม่ระบุ']

const orderBy = (order) => (a, b) => {
  const ia = order.indexOf(a.label)
  const ib = order.indexOf(b.label)
  return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib)
}

/**
 * ล้างแถวสมาชิก แล้วตัดสมาชิกที่เบอร์โทรซ้ำกับคนอื่นออก (ทุกคนที่เบอร์ซ้ำ ไม่เหลือไว้คนใดคนหนึ่ง)
 * สมาชิกที่ถูกตัดยังมีรายการขายอยู่ใน sales.csv แต่จะไม่ถูกนับในสถิติฝั่งสมาชิก
 */
export function cleanCustomers(rawRows) {
  const all = []
  for (const r of rawRows) {
    const id = String(r.customer_id ?? '').trim()
    if (!id) continue
    all.push({
      id,
      gender: String(r.gender ?? '').trim() || 'ไม่ระบุ',
      ageGroup: String(r.age_group ?? '').trim() || 'ไม่ระบุ',
      homeBranchId: String(r.home_branch_id ?? '').trim(),
      joinedDate: String(r.joined_date ?? '').trim(),
      phone: String(r.phone ?? '').trim(),
    })
  }

  const phoneCount = new Map()
  for (const c of all) if (c.phone) phoneCount.set(c.phone, (phoneCount.get(c.phone) ?? 0) + 1)

  const customers = all.filter((c) => !c.phone || phoneCount.get(c.phone) === 1)
  return { customers, removed: all.length - customers.length }
}

export function cleanBranches(rawRows) {
  return rawRows
    .map((r) => ({
      id: String(r.branch_id ?? '').trim(),
      name: String(r.branch ?? '').trim(),
      type: String(r.branch_type ?? '').trim() || 'ไม่ระบุ',
      openedDate: String(r.opened_date ?? '').trim(),
    }))
    .filter((b) => b.id && b.name)
}

const monthKey = (dateKey) => dateKey.slice(0, 7)

/** จำนวนเดือน (นับเดือนที่เริ่มบางส่วนเป็น 1 เดือน) ระหว่างสองวันที่ ขั้นต่ำ 1 */
function monthsBetween(startKey, endKey) {
  const [sy, sm] = startKey.split('-').map(Number)
  const [ey, em] = endKey.split('-').map(Number)
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1)
}

function groupCount(items, keyFn) {
  const m = new Map()
  for (const it of items) m.set(keyFn(it), (m.get(keyFn(it)) ?? 0) + 1)
  return [...m.entries()].map(([label, value]) => ({ label, value }))
}

/**
 * รวมทุกค่าฝั่งสมาชิกที่หน้า Dashboard ต้องใช้
 * salesRows: แถวจาก cleanRows (มี orderId, date, branch, lineTotal, customerId)
 */
export function buildCustomerDashboard({ customers, branches, salesRows, firstDate, lastDate }) {
  const byId = new Map(customers.map((c) => [c.id, c]))
  const branchById = new Map(branches.map((b) => [b.id, b]))
  const branchByName = new Map(branches.map((b) => [b.name, b]))

  // ยอดขายที่มี customer_id (สมาชิกทุกคน รวมที่ถูกตัดเบอร์ซ้ำ) เทียบกับลูกค้าทั่วไป
  let totalSales = 0
  let memberSalesAll = 0
  for (const r of salesRows) {
    totalSales += r.lineTotal
    if (r.customerId) memberSalesAll += r.lineTotal
  }

  // สรุปรายสมาชิก (เฉพาะสมาชิกที่ผ่านการล้าง)
  const spend = new Map()
  let homeSales = 0
  let keptMemberSales = 0
  const homeAgg = new Map() // homeBranchId -> { all, atHome }
  for (const r of salesRows) {
    const c = r.customerId && byId.get(r.customerId)
    if (!c) continue
    const s = spend.get(c.id) ?? { sales: 0, bills: new Set() }
    s.sales += r.lineTotal
    s.bills.add(r.orderId)
    spend.set(c.id, s)
    keptMemberSales += r.lineTotal

    const home = branchById.get(c.homeBranchId)
    const agg = homeAgg.get(c.homeBranchId) ?? { all: 0, atHome: 0 }
    agg.all += r.lineTotal
    if (home && home.name === r.branch) {
      agg.atHome += r.lineTotal
      homeSales += r.lineTotal
    }
    homeAgg.set(c.homeBranchId, agg)
  }

  // สมาชิกใหม่รายเดือน: เดือนสุดท้ายถ้าข้อมูลขายยังไม่ถึงสิ้นเดือนให้ติดป้าย partial
  const joined = groupCount(customers.filter((c) => c.joinedDate), (c) => monthKey(c.joinedDate))
    .map(({ label, value }) => ({ month: label, members: value }))
    .sort((a, b) => a.month.localeCompare(b.month))
  const lastMonth = lastDate ? monthKey(lastDate) : null
  const [ly, lm] = (lastMonth ?? '0-0').split('-').map(Number)
  const lastDayOfMonth = new Date(Date.UTC(ly, lm, 0)).getUTCDate()
  const lastMonthPartial = lastDate ? Number(lastDate.slice(8)) < lastDayOfMonth : false
  for (const j of joined) j.partial = lastMonthPartial && j.month === lastMonth

  // เพศ / ช่วงอายุ
  const gender = groupCount(customers, (c) => c.gender).sort(orderBy(GENDER_ORDER))
  const age = groupCount(customers, (c) => c.ageGroup).sort(orderBy(AGE_ORDER))

  // ยอดซื้อเฉลี่ยต่อสมาชิกที่ซื้อ แยกช่วงอายุ
  const ageSpend = new Map()
  for (const [id, s] of spend) {
    const g = byId.get(id).ageGroup
    const a = ageSpend.get(g) ?? { sales: 0, buyers: 0 }
    a.sales += s.sales
    a.buyers += 1
    ageSpend.set(g, a)
  }
  const avgByAge = [...ageSpend.entries()]
    .map(([label, a]) => ({ label, value: round2(a.sales / a.buyers) }))
    .sort(orderBy(AGE_ORDER))

  // ยอดขายแยกประเภทสาขา
  const typeSales = new Map()
  for (const r of salesRows) {
    const type = branchByName.get(r.branch)?.type ?? 'ไม่ระบุ'
    typeSales.set(type, (typeSales.get(type) ?? 0) + r.lineTotal)
  }
  const salesByType = [...typeSales.entries()]
    .map(([label, v]) => ({ label, value: round2(v) }))
    .sort((a, b) => b.value - a.value)

  // ตารางสาขา: สมาชิกบ้าน, สมาชิกใหม่ต่อเดือน (ปรับตามอายุสาขาในช่วงข้อมูล), % ยอดซื้อที่สาขาบ้าน
  const windowStart = joined[0] ? `${joined[0].month}-01` : firstDate
  const branchRows = branches.map((b) => {
    const members = customers.filter((c) => c.homeBranchId === b.id).length
    const start = b.openedDate && b.openedDate > windowStart ? b.openedDate : windowStart
    const months = lastDate ? monthsBetween(start, lastDate) : 1
    const agg = homeAgg.get(b.id)
    return {
      id: b.id,
      name: b.name,
      type: b.type,
      openedDate: b.openedDate,
      members,
      perMonth: round2(members / months),
      homeShare: agg && agg.all > 0 ? agg.atHome / agg.all : null,
    }
  })

  const top = [...spend.entries()]
    .map(([id, s]) => {
      const c = byId.get(id)
      return {
        id,
        ageGroup: c.ageGroup,
        home: branchById.get(c.homeBranchId)?.name ?? '-',
        sales: round2(s.sales),
        bills: s.bills.size,
      }
    })
    .sort((a, b) => b.sales - a.sales || a.id.localeCompare(b.id))
    .slice(0, 10)

  return {
    memberCount: customers.length,
    buyers: spend.size,
    memberShare: totalSales > 0 ? memberSalesAll / totalSales : 0,
    avgPerBuyer: spend.size > 0 ? round2(keptMemberSales / spend.size) : 0,
    homeShare: keptMemberSales > 0 ? homeSales / keptMemberSales : 0,
    joined,
    gender,
    age,
    avgByAge,
    salesByType,
    branchRows,
    top,
  }
}
