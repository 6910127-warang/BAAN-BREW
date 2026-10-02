import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import Kpis from './components/Kpis'
import DailySalesChart from './components/DailySalesChart'
import BranchSalesChart from './components/BranchSalesChart'
import { buildDashboard, cleanHeader, cleanRows, findMissingColumns } from './lib/metrics'

function App() {
  const [dashboard, setDashboard] = useState(null)
  const [fileName, setFileName] = useState('')
  const [skipped, setSkipped] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="min-h-screen bg-paper text-ink">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header>
          <h1 className="text-3xl font-bold">บ้านบรู Dashboard</h1>
        </header>

        {error && (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800">
            {error}
          </p>
        )}

        {skipped > 0 && dashboard && (
          <p className="text-sm text-ink/60">
            ข้ามไป {skipped.toLocaleString('en-US')} แถวที่ order_id, datetime, qty หรือ unit_price อ่านไม่ได้
          </p>
        )}

        {dashboard && (
          <>
            <Kpis data={dashboard} />
            <DailySalesChart daily={dashboard.daily} />
            <BranchSalesChart branches={dashboard.branches} />
          </>
        )}
      </main>
    </div>
  )
}

export default App
