import { useEffect, useState } from 'react'
import './App.css'

// آدرس سرور برای حالت توسعه (بعداً بازی واقعی این‌جا اضافه می‌شه)
const API_URL = 'http://localhost:3001/api/health'

function App() {
  const [status, setStatus] = useState('در حال بررسی اتصال به سرور...')

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.ok ? 'سرور وصل است ✅' : 'سرور پاسخ غیرمنتظره داد')
      })
      .catch(() => {
        setStatus('سرور در دسترس نیست ❌ (اول npm run dev توی پوشه‌ی server رو بزن)')
      })
  }, [])

  return (
    <main className="test-page">
      <h1>بازی حدس آهنگ</h1>
      <p>این فقط صفحه‌ی تستی مرحله‌ی اول پروژه‌ست.</p>
      <p className="status">{status}</p>
    </main>
  )
}

export default App
