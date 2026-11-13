import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getProfile } from '../games/song/api.js'
import { getWordStats } from '../games/word/api.js'
import { getColorStats } from '../games/color/api.js'
import { getSurveyStats } from '../games/survey/api.js'
import { logout } from '../shared/api.js'
import { faNumber } from '../shared/format.js'
import { SITE_NAME } from '../shared/site.js'
import ProfileCalendar from './ProfileCalendar.jsx'
import { ColorStatsPanel, SurveyStatsPanel, WordStatsPanel } from './ProfileStats.jsx'
import { faMonthYear } from './calendar.js'
import '../games/survey/survey.css' // برای کارت هدف جمعی (توی تب نظرسنجی)
import './profile.css'

// آمار بازی آهنگ به شکل لیست «اسم / عدد»
function statRows(stats, practiceGames) {
  const winPercent = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0
  return [
    ['بازی‌های مسابقه‌ای', faNumber(stats.played)],
    ['بازی‌های تمرینی', faNumber(practiceGames)],
    ['درصد برد', `${faNumber(winPercent)}٪`],
    ['رکورد فعلی', faNumber(stats.currentStreak)],
    ['بهترین رکورد', faNumber(stats.maxStreak)],
    ['بهترین امتیاز', faNumber(stats.bestScore)],
    ['میانگین امتیاز', faNumber(stats.averageScore)],
  ]
}

// تب‌های صفحه‌ی حساب. بقیه‌ی تب‌ها (غیر از آهنگ که با خود پروفایل میاد) آمارشون فقط وقتی تبشون باز می‌شه گرفته می‌شه
const TABS = [
  { id: 'song', label: 'حدس آهنگ' },
  { id: 'word', label: 'واژه‌یاب', load: getWordStats, Panel: WordStatsPanel },
  { id: 'color', label: 'رنگ', load: getColorStats, Panel: ColorStatsPanel },
  { id: 'survey', label: 'نظرسنجی', load: getSurveyStats, Panel: SurveyStatsPanel },
]

// صفحه‌ی حساب کاربری (آدرس /profile)
// user: کاربر واردشده یا null، onUserChange: برای خروج از حساب (هر دو از App میان)
function ProfilePage({ user, onUserChange }) {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('song')
  const [stats, setStats] = useState({}) // آمار هر تب (id تب -> داده)، بعد از اولین باز شدن تب
  const [failed, setFailed] = useState({}) // تب‌هایی که گرفتن آمارشون خطا داد
  const userId = user ? user.id : null

  useEffect(() => {
    document.title = `حساب کاربری · ${SITE_NAME}`
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getProfile()
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError('سرور در دسترس نیست. اول سرور رو روشن کن.'))
    return () => {
      cancelled = true
    }
  }, [userId])

  // آمار تبِ باز، اگه قبلاً نگرفتیم و خطا هم نداده، از سرور گرفته می‌شه
  const activeTab = TABS.find((t) => t.id === tab)
  useEffect(() => {
    if (!userId || !activeTab?.load || stats[tab] || failed[tab]) return
    let cancelled = false
    activeTab
      .load()
      .then((d) => !cancelled && setStats((old) => ({ ...old, [tab]: d })))
      .catch(() => !cancelled && setFailed((old) => ({ ...old, [tab]: true })))
    return () => {
      cancelled = true
    }
  }, [userId, tab, activeTab, stats, failed])

  async function handleLogout() {
    try {
      await logout()
    } finally {
      onUserChange(null)
      navigate('/')
    }
  }

  if (!user) {
    return (
      <main className="profile-page profile-guest">
        <h1>حساب کاربری</h1>
        <p>برای دیدن آمار و فعالیتت، اول وارد شو یا حساب بساز. دکمه‌ی «ورود / ثبت‌نام» بالای صفحه‌ست.</p>
        <Link to="/" className="ghost-button">
          برگشت به صفحه‌ی اول
        </Link>
      </main>
    )
  }

  if (error && !data) {
    return (
      <main className="profile-page profile-guest">
        <p className="error">{error}</p>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="profile-page profile-guest">
        <p className="loading">در حال بارگذاری...</p>
      </main>
    )
  }

  const since = data.memberSince ? faMonthYear(data.memberSince) : ''
  const rank = data.rank
  const rankText = rank ? `رتبه‌ی امروز ${faNumber(rank.rank)} از ${faNumber(rank.totalPlayers)}` : ''

  const logoutButton = (className) => (
    <button type="button" className={`profile-logout ${className}`} onClick={handleLogout}>
      خروج از حساب
    </button>
  )

  return (
    <main className="profile-page">
      <aside className="profile-side">
        <span className="profile-avatar" aria-hidden="true">
          {data.username[0].toUpperCase()}
        </span>
        <div className="profile-id">
          <h1 dir="ltr">{data.username}</h1>
          <p>
            {since && `عضو از ${since}`}
            {rank && <span className="profile-rank-inline"> · {rankText}</span>}
          </p>
        </div>
        {rank && (
          <div className="profile-rank-card">
            <span>رتبه‌ی امروز</span>
            <b>
              {faNumber(rank.rank)} <small>از {faNumber(rank.totalPlayers)}</small>
            </b>
          </div>
        )}
        {logoutButton('desktop-only')}
      </aside>

      <section className="profile-content">
        <nav className="profile-tabs" aria-label="بازی">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'song' ? (
          <div className="profile-panels">
            <ProfileCalendar today={data.today} activity={data.activity} />
            <section className="profile-card profile-stats" aria-label="آمار">
              <dl>
                {statRows(data.stats, data.practiceGames).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
                <div className="total">
                  <dt>مجموع امتیاز</dt>
                  <dd>{faNumber(data.stats.totalScore)}</dd>
                </div>
              </dl>
            </section>
          </div>
        ) : failed[tab] ? (
          <section className="profile-card profile-soon">
            <p className="error">آمار گرفته نشد. سرور در دسترس نیست.</p>
          </section>
        ) : !stats[tab] ? (
          <section className="profile-card profile-soon">
            <p className="loading">در حال بارگذاری...</p>
          </section>
        ) : (
          <activeTab.Panel stats={stats[tab]} />
        )}

        {logoutButton('mobile-only')}
      </section>
    </main>
  )
}

export default ProfilePage
