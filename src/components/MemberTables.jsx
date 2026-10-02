import { formatBaht, formatLongDate, formatNumber } from '../lib/format'

const th = 'px-3 py-2 text-left text-sm font-medium text-ink/60 whitespace-nowrap'
const td = 'px-3 py-2 text-sm whitespace-nowrap'

export function BranchTable({ rows }) {
  return (
    <section className="min-w-0 rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold">สมาชิกตามสาขาบ้าน</h2>
      <p className="mb-4 text-sm text-ink/60">
        สมาชิกใหม่/เดือน คิดตามอายุสาขาในช่วงข้อมูล (อารีย์เปิดทีหลัง จึงเทียบกับสาขาอื่นได้ยุติธรรม)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/15">
              <th className={th}>สาขา</th>
              <th className={th}>ประเภท</th>
              <th className={th}>เปิดเมื่อ</th>
              <th className={`${th} text-right`}>สมาชิก</th>
              <th className={`${th} text-right`}>ใหม่/เดือน</th>
              <th className={`${th} text-right`}>ซื้อที่สาขาบ้าน</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-ink/10 last:border-0">
                <td className={td}>{r.name}</td>
                <td className={td}>{r.type}</td>
                <td className={td}>{r.openedDate ? formatLongDate(r.openedDate) : '-'}</td>
                <td className={`${td} text-right tabular-nums`}>{formatNumber(r.members)}</td>
                <td className={`${td} text-right tabular-nums`}>{formatNumber(r.perMonth, 1)}</td>
                <td className={`${td} text-right tabular-nums`}>
                  {r.homeShare == null ? '-' : `${(r.homeShare * 100).toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function TopMembersTable({ rows }) {
  return (
    <section className="min-w-0 rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold">สมาชิกที่ซื้อมากสุด 10 อันดับ</h2>
      <p className="mb-4 text-sm text-ink/60">เรียงตามยอดซื้อรวม</p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/15">
              <th className={th}>#</th>
              <th className={th}>รหัสสมาชิก</th>
              <th className={th}>อายุ</th>
              <th className={th}>สาขาบ้าน</th>
              <th className={`${th} text-right`}>บิล</th>
              <th className={`${th} text-right`}>ยอดซื้อ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-ink/10 last:border-0">
                <td className={`${td} tabular-nums`}>{i + 1}</td>
                <td className={td}>{r.id}</td>
                <td className={td}>{r.ageGroup}</td>
                <td className={td}>{r.home}</td>
                <td className={`${td} text-right tabular-nums`}>{formatNumber(r.bills)}</td>
                <td className={`${td} text-right tabular-nums`}>{formatBaht(r.sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
