import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router'
import { getMe } from './shared/api.js'
import { SITE_NAME } from './shared/site.js'
import AuthPanel from './shared/components/AuthPanel.jsx'
import ThemeToggle from './shared/components/ThemeToggle.jsx'
import Logo from './shared/components/Logo.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import WeeklyPage from './pages/WeeklyPage.jsx'
import SongGame from './games/song/SongGame.jsx'
import WordGame from './games/word/WordGame.jsx'
import ColorGame from './games/color/ColorGame.jsx'
import SurveyGame from './games/survey/SurveyGame.jsx'
import ClueGame from './games/clue/ClueGame.jsx'
import LyricsGame from './games/lyrics/LyricsGame.jsx'
import './shared/shared.css'

// پوسته‌ی سایت: سربرگ مشترک (اسم سایت + آیکون جدول هفته + ورود) و صفحه‌ها
//   /      صفحه‌ی اول (انتخاب بازی)
//   /song  جورزیک (مسابقه‌ای)، /song/practice (تمرینی)
//   /word  بازی جورچین
//   /color  بازی جورنگ
//   /lyrics  «جورشعر»
//   /survey  نظرسنجی «صد جور»
//   /clue  بازی جوربندی
//   /profile  حساب کاربری (آمار و تقویم فعالیت)
//   /about  درباره: سایت چطوری کار می‌کنه + درباره‌ی ما
//   /weekly  جدول هفته (امتیاز یکسان همه‌ی بازی‌ها)
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
        {/* لوگو: اسم کامل (مشکی توی روز، سفید توی شب) */}
        <Link to="/" className="site-logo" aria-label={`${SITE_NAME}، صفحه‌ی اول`}>
          <Logo className="site-logo-img" alt={SITE_NAME} />
        </Link>
        {/* جدول هفته: فقط آیکون جایزه، توی همه‌ی صفحه‌ها */}
        <NavLink to="/weekly" className="site-weekly" aria-label="جدول هفته" title="جدول هفته">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
            <path d="M17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4" />
          </svg>
        </NavLink>
        <ThemeToggle />
        <AuthPanel user={user} onUserChange={setUser} />
      </header>

      {/* تا وقتی معلوم نشده کاربر وارد شده یا نه، صفحه‌ها رو نشون نده (یه لحظه‌ست) */}
      {authChecked && (
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/song" element={<SongGame key="daily" user={user} mode="daily" />} />
          <Route path="/song/practice" element={<SongGame key="practice" user={user} mode="practice" />} />
          <Route path="/word" element={<WordGame user={user} />} />
          <Route path="/color" element={<ColorGame user={user} />} />
          <Route path="/clue" element={<ClueGame user={user} />} />
          <Route path="/survey" element={<SurveyGame user={user} />} />
          <Route path="/lyrics" element={<LyricsGame user={user} />} />
          <Route path="/profile" element={<ProfilePage user={user} onUserChange={setUser} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/weekly" element={<WeeklyPage user={user} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      )}
    </div>
  )
}

export default App
