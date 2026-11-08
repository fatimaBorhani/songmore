// شمارش معکوس تا نیمه‌شب تهران (وقتی بازی روزانه‌ی بعدی میاد)، مثلاً «۰۸:۱۲:۴۰»
import { useEffect, useState } from 'react'
import { faDigits } from '../format.js'

function secondsToTehranMidnight() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (type) => Number(parts.find((p) => p.type === type).value)
  return 24 * 3600 - (get('hour') * 3600 + get('minute') * 60 + get('second'))
}

function formatClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return faDigits([h, m, s].map((n) => String(n).padStart(2, '0')).join(':'))
}

function Countdown() {
  const [seconds, setSeconds] = useState(secondsToTehranMidnight)
  useEffect(() => {
    const timer = setInterval(() => setSeconds(secondsToTehranMidnight()), 1000)
    return () => clearInterval(timer)
  }, [])
  return <b>{formatClock(seconds)}</b>
}

export default Countdown
