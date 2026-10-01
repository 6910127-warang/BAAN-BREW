import { useEffect, useState } from 'react'

// true เมื่อหน้าจอกว้างน้อยกว่า breakpoint (ค่าเริ่มต้น 640px = sm ของ Tailwind)
export default function useIsNarrow(maxWidth = 639) {
  const query = `(max-width: ${maxWidth}px)`
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e) => setNarrow(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return narrow
}
