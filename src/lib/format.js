// ใช้ en-US เพื่อให้ได้จุลภาคคั่นหลักพันและเลขอารบิกแน่นอน
export const formatNumber = (n, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)

export const formatBaht = (n, digits = 0) => `฿${formatNumber(n, digits)}`

// 2025-04-01 -> 1 เม.ย. 2568
export const formatLongDate = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

// 2025-04-01 -> 1 เม.ย. 68
export const formatShortDate = (key) => {
  const [y, m, d] = key.split('-')
  return `${Number(d)} ${THAI_MONTHS_SHORT[Number(m) - 1]} ${String((Number(y) + 543) % 100).padStart(2, '0')}`
}
