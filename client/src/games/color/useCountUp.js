import { useEffect, useRef, useState } from 'react'

// عددی که از `from` تا `value` آروم و ریز ریز (صدم صدم) بالا می‌ره؛ برای نشون دادن امتیاز
// delay: چند میلی‌ثانیه صبر کنه تا دایره‌ها دیده بشن، بعد بشماره
export function useCountUp(value, { from = 0, duration = 1500, delay = 350 } = {}) {
  const [shown, setShown] = useState(from)
  const frameRef = useRef(null)

  useEffect(() => {
    // اگه «کاهش حرکت» روشنه، بدون شمارش
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let startTime = null
    function tick(now) {
      if (startTime === null) startTime = now
      const t = reduce ? 1 : Math.min((now - startTime) / duration, 1)
      const eased = 1 - (1 - t) ** 3 // اول تند، آخر آروم
      setShown(Math.round((from + (value - from) * eased) * 100) / 100)
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }
    const timer = setTimeout(() => {
      frameRef.current = requestAnimationFrame(tick)
    }, reduce ? 0 : delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frameRef.current)
    }
  }, [value, from, duration, delay])

  return shown
}
