import { useEffect, useState } from 'react'
import { Link, Route, Routes } from 'react-router'
import { getMe } from './shared/api.js'
import { SITE_NAME } from './shared/site.js'
import AuthPanel from './shared/components/AuthPanel.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SongGame from './games/song/SongGame.jsx'
import WordGame from './games/word/WordGame.jsx'
import './shared/shared.css'

// پوسته‌ی سایت: سربرگ مشترک (اسم سایت + ورود) و صفحه‌ها
//   /      صفحه‌ی اول (انتخاب بازی)
//   /song  بازی حدس آهنگ (مسابقه‌ای)، /song/practice (تمرینی)
//   /word  بازی واژه‌یاب
//   /profile  حساب کاربری (آمار و تقویم فعالیت)
function App() {
  const [user, setUser] = useState(null) // کاربر واردشده، یا null
  const [authChecked, setAuthChecked] = useState(false) // هنوز معلوم نیست وارد شده یا نه؟

  // اول کار ببین کاربر قبلاً وارد شده یا نه (کوکی ورود)
  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {}) // اگه سرور در دسترس نبود، خود بازی خطا رو نشون می‌ده
      .finally(() => setAuthChecked(true))
  }, [])

  return (
    <div className="site">
      <header className="site-header">
        <Link to="/" className="site-logo">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
          </svg>
          <span>{SITE_NAME}</span>
        </Link>
        <AuthPanel user={user} onUserChange={setUser} />
      </header>

      {/* تا وقتی معلوم نشده کاربر وارد شده یا نه، صفحه‌ها رو نشون نده (یه لحظه‌ست) */}
      {authChecked && (
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/song" element={<SongGame key="daily" user={user} mode="daily" />} />
          <Route path="/song/practice" element={<SongGame key="practice" user={user} mode="practice" />} />
          <Route path="/word" element={<WordGame user={user} />} />
          <Route path="/profile" element={<ProfilePage user={user} onUserChange={setUser} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      )}
    </div>
  )
}

export default App
