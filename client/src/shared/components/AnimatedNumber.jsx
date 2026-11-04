import { useEffect, useRef, useState } from 'react'
import { faNumber } from '../format.js'

// عددی که وقتی عوض می‌شه، نرم از مقدار قبلی به مقدار جدید می‌شمره (با رقم فارسی)
// from: اولین بار از کجا شروع کنه (مثلاً 0 برای شمردن امتیاز آخر بازی)
function AnimatedNumber({ value, from = value, duration = 600 }) {
  const [shown, setShown] = useState(from)
  const shownRef = useRef(from)
  const frameRef = useRef(null)

  useEffect(() => {
    const start = shownRef.current
    if (start === value) return
    // اگه کاربر «کاهش حرکت» رو روشن کرده، بدون انیمیشن
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const startTime = performance.now()

    function tick(now) {
      const t = reduce ? 1 : Math.min((now - startTime) / duration, 1)
      const eased = 1 - (1 - t) ** 3 // اول تند، آخر آروم
      const next = Math.round(start + (value - start) * eased)
      shownRef.current = next
      setShown(next)
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration])

  return <>{faNumber(shown)}</>
}

export default AnimatedNumber
