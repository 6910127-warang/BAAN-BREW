import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { cleanHeader } from '../lib/metrics'

export default function UploadBox({ fileName, onParsed, onError }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError('รองรับเฉพาะไฟล์ .csv')
      return
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: cleanHeader,
      complete: (result) =>
        onParsed({ fileName: file.name, rows: result.data, fields: result.meta.fields ?? [] }),
      error: (err) => onError(`อ่านไฟล์ไม่สำเร็จ: ${err.message}`),
    })
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFile(e.dataTransfer.files?.[0])
      }}
      className={`flex flex-col gap-3 rounded-lg border-2 border-dashed px-5 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
        dragging ? 'border-brew bg-brew/5' : 'border-ink/20 bg-white'
      }`}
    >
      <div>
        <p className="font-medium">
          {fileName ? `ข้อมูลจาก ${fileName}` : 'กำลังโหลดข้อมูล...'}
        </p>
        <p className="text-sm text-ink/60">ลากไฟล์ CSV อื่นมาวาง หรือกดปุ่มเพื่อเปลี่ยนข้อมูล</p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-md bg-brew px-4 py-2 text-sm font-medium text-white hover:bg-brew/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brew"
      >
        เลือกไฟล์
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
