import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import Kpis from './components/Kpis'
import DailySalesChart from './components/DailySalesChart'
import BranchSalesChart from './components/BranchSalesChart'
import CustomerKpis from './components/CustomerKpis'
import MemberGrowthChart from './components/MemberGrowthChart'
import SimpleBarChart from './components/SimpleBarChart'
import { BranchTable, TopMembersTable } from './components/MemberTables'
import { buildDashboard, cleanHeader, cleanRows, findMissingColumns } from './lib/metrics'
import { buildCustomerDashboard, cleanBranches, cleanCustomers } from './lib/customerMetrics'
import Lab2Page from './lab2/Lab2Page'
import { toLab2Rows } from './lab2/lab2Utils'
import { formatBaht, formatNumber } from './lib/format'

// อ่าน CSV ใน public/ แล้วคืน rows เป็น Promise
const loadCsv = (name) =>
  new Promise((resolve, reject) => {
    Papa.parse(`${import.meta.env.BASE_URL}${name}`, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: cleanHeader,
      complete: (result) => resolve(result.data),
      error: () => reject(new Error(name)),
    })
  })

const TABS = [
  { id: 'overview', label: 'ภาพรวม' },
  { id: 'lab2', label: 'Lab 2.2 · ซ่อมกราฟ' },
]

function App() {
  const [tab, setTab] = useState(() => TABS.find((t) => `#${t.id}` === location.hash)?.id ?? 'overview')
  const [products, setProducts] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [fileName, setFileName] = useState('')
  const [skipped, setSkipped] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [customerData, setCustomerData] = useState(null)
  const [removedCustomers, setRemovedCustomers] = useState(0)
  const [customerError, setCustomerError] = useState('')
  const [salesRows, setSalesRows] = useState([])

  function handleParsed({ fileName, rows, fields }) {
    const missing = findMissingColumns(fields)
    if (missing.length > 0) {
      setDashboard(null)
      setLoading(false)
      setError(
        `ไฟล์ ${fileName} ขาดคอลัมน์: ${missing.join(', ')} (ถ้าเป็น sales.csv ตรวจว่าไฟล์อยู่ที่ public/sales.csv)`,
      )
      return
    }

    const cleaned = cleanRows(rows)
    if (cleaned.rows.length === 0) {
      setDashboard(null)
      setLoading(false)
      setError('อ่านข้อมูลได้ 0 แถว ตรวจรูปแบบ datetime, qty และ unit_price')
      return
    }

    setError('')
    setFileName(fileName)
    setSkipped(cleaned.skipped)
    setSalesRows(cleaned.rows)
    setDashboard(buildDashboard(cleaned.rows))
    setLoading(false)
  }

  function handleError(message) {
    setError(message)
    setLoading(false)
  }

  // โหลด public/sales.csv อัตโนมัติตอนเปิดหน้า
  useEffect(() => {
    Papa.parse(`${import.meta.env.BASE_URL}sales.csv`, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: cleanHeader,
      complete: (result) =>
        handleParsed({ fileName: 'sales.csv', rows: result.data, fields: result.meta.fields ?? [] }),
      error: () => handleError('โหลด /sales.csv ไม่ได้ ตรวจว่ามีไฟล์ public/sales.csv'),
    })
  }, [])

  useEffect(() => {
    loadCsv('products.csv').then(setProducts, () => setProducts([]))
  }, [])

  const lab2Rows = useMemo(() => toLab2Rows(salesRows), [salesRows])

  function chooseTab(id) {
    setTab(id)
    history.replaceState(null, '', `#${id}`)
  }

  // ข้อมูลสมาชิก: โหลด customers.csv + branches.csv แล้ว join กับแถวขายเมื่อ sales พร้อม
  useEffect(() => {
    if (!dashboard) return
    let cancelled = false
    Promise.all([loadCsv('customers.csv'), loadCsv('branches.csv')])
      .then(([custRaw, branchRaw]) => {
        if (cancelled) return
        const { customers, removed } = cleanCustomers(custRaw)
        setRemovedCustomers(removed)
        setCustomerError('')
        setCustomerData(
          buildCustomerDashboard({
            customers,
            branches: cleanBranches(branchRaw),
            salesRows,
            firstDate: dashboard.firstDate,
            lastDate: dashboard.lastDate,
          }),
        )
      })
      .catch((e) => {
        if (!cancelled) setCustomerError(`โหลด ${e.message} ไม่ได้ ข้อมูลสมาชิกจึงไม่แสดง`)
      })
    return () => {
      cancelled = true
    }
  }, [dashboard, salesRows])

  return (
    <div className="min-h-screen bg-paper text-ink">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header>
          <h1 className="text-3xl font-bold">บ้านบรู Dashboard</h1>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-ink/10 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => chooseTab(t.id)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
                tab === t.id ? 'bg-brew text-white' : 'text-ink/70 hover:bg-ink/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'lab2' && dashboard && <Lab2Page rows={lab2Rows} products={products} />}

        {tab === 'overview' && error && (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800">
            {error}
          </p>
        )}

        {tab === 'overview' && skipped > 0 && dashboard && (
          <p className="text-sm text-ink/60">
            ข้ามไป {skipped.toLocaleString('en-US')} แถวที่ order_id, datetime, qty หรือ unit_price อ่านไม่ได้
          </p>
        )}

        {tab === 'overview' && dashboard && (
          <>
            <Kpis data={dashboard} />
            <DailySalesChart daily={dashboard.daily} />
            <BranchSalesChart branches={dashboard.branches} />
          </>
        )}

        {tab === 'overview' && customerError && (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800">
            {customerError}
          </p>
        )}

        {tab === 'overview' && customerData && (
          <>
            <div>
              <h2 className="text-2xl font-bold">สมาชิก</h2>
              <p className="mt-1 text-sm text-ink/60">
                ตัดสมาชิกที่เบอร์โทรซ้ำออก {formatNumber(removedCustomers)} คน
                (ยอดขายของคนเหล่านี้ยังนับในยอดขายรวมและสัดส่วนสมาชิก แต่ไม่นับในสถิติรายคน)
              </p>
            </div>
            <CustomerKpis data={customerData} />
            <MemberGrowthChart joined={customerData.joined} />
            <div className="grid gap-6 lg:grid-cols-2">
              <SimpleBarChart
                title="สมาชิกตามเพศ"
                subtitle="จำนวนคน"
                data={customerData.gender}
                format={(v) => formatNumber(v)}
                tooltipLabel="สมาชิก"
              />
              <SimpleBarChart
                title="สมาชิกตามช่วงอายุ"
                subtitle="จำนวนคน"
                data={customerData.age}
                format={(v) => formatNumber(v)}
                tooltipLabel="สมาชิก"
              />
              <SimpleBarChart
                title="ยอดซื้อเฉลี่ยต่อสมาชิก ตามช่วงอายุ"
                subtitle="฿ ต่อคน (เฉพาะคนที่ซื้อ)"
                data={customerData.avgByAge}
                format={(v) => formatBaht(v)}
                tooltipLabel="เฉลี่ยต่อคน"
              />
              <SimpleBarChart
                title="ยอดขายตามประเภทสาขา"
                subtitle="฿ รวมทุกสาขาในประเภทเดียวกัน"
                data={customerData.salesByType}
                format={(v) => formatBaht(v)}
                tooltipLabel="ยอดขาย"
              />
            </div>
            <BranchTable rows={customerData.branchRows} />
            <TopMembersTable rows={customerData.top} />
          </>
        )}
      </main>
    </div>
  )
}

export default App
