import { useEffect, useState } from 'react'
import { call } from '../shared/api.js'
import { faNumber } from '../shared/format.js'
import { SITE_NAME } from '../shared/site.js'
import { faDay } from './calendar.js'
import './weekly.css'

// امتیاز هر بازی توی کارت «من» (به همین ترتیب)
const GAME_NAMES = [
  ['song', 'جورزیک'],
  ['word', 'جورچین'],
  ['color', 'رنگ'],
  ['clue', 'جوربندی'],
]

// قانون امتیاز؛ باید با server/games/weekly/weekly.js یکی باشه
const RULES = [
  ['جورزیک', 'هر ۳ آهنگ تموم بشه', 'حداقل ۲ آهنگ درست', 'هر ۳ درست'],
  ['جورچین', 'هر ۳ کلمه تموم بشه', 'حداقل ۲ کلمه توی ۶ حدس', 'هر ۳ کلمه'],
  ['جورنگ', 'هر ۵ دور', 'جمع ۳۰ از ۵۰ یا بیشتر', '۴۰ یا بیشتر'],
  ['جوربندی', 'پیدا کنی یا تسلیم بشی', 'پیداش کنی', 'بدون راهنما و با ۲۰ حدس یا کمتر'],
]

// کارت بالای صفحه: رتبه و امتیاز خود بازیکن
function MyCard({ me, user }) {
  if (!user) {
    return <p className="weekly-me weekly-me-empty">برای اینکه اسمت توی جدول بیاد، از بالای صفحه وارد شو یا ثبت‌نام کن.</p>
  }
  if (!me || me.rank === null) {
    return <p className="weekly-me weekly-me-empty">هنوز این هفته امتیازی نگرفتی. یه بازی رو تموم کن تا اسمت بیاد.</p>
  }
  return (
    <section className="weekly-me" aria-label="امتیاز من">
      <div className="weekly-me-main">
        <span className="weekly-me-rank">
          رتبه‌ی <b>{faNumber(me.rank)}</b>
        </span>
        <span className="weekly-me-points">
          <b>{faNumber(me.points)}</b> امتیاز
        </span>
      </div>
      <ul className="weekly-me-games">
        {GAME_NAMES.map(([id, name]) => (
          <li key={id}>
            {name} <b>{faNumber(me[id])}</b>
          </li>
        ))}
      </ul>
    </section>
  )
}

// جدول هفته (آدرس /weekly): امتیاز یکسان همه‌ی بازی‌ها از شنبه تا جمعه
// user: کاربر واردشده یا null (از App میاد؛ با عوض شدنش جدول دوباره گرفته می‌شه)
function WeeklyPage({ user }) {
  const [board, setBoard] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = `جدول هفته · ${SITE_NAME}`
  }, [])

  const userId = user ? user.id : null
  useEffect(() => {
    call('/api/weekly')
      .then((b) => {
        setError('')
        setBoard(b)
      })
      .catch(() => setError('سرور در دسترس نیست. اول سرور رو روشن کن.'))
  }, [userId])

  if (!board) {
    return (
      <main className="weekly-page">
        <p className={error ? 'error' : 'loading'}>{error || 'در حال بارگذاری...'}</p>
      </main>
    )
  }

  return (
    <main className="weekly-page">
      <header className="weekly-head">
        <h1>جدول هفته</h1>
        <p>
          {faDay(board.weekStart)} تا {faDay(board.weekEnd)} ·{' '}
          {board.daysLeft > 0 ? `${faNumber(board.daysLeft)} روز دیگه تا آخر هفته` : 'امروز روز آخر هفته‌ست'}
        </p>
      </header>

      <MyCard me={board.me} user={user} />

      {board.top.length === 0 ? (
        <p className="weekly-empty">هنوز کسی این هفته امتیاز نگرفته. اولی تو باش!</p>
      ) : (
        <ol className="weekly-list" aria-label="رتبه‌ها">
          {board.top.map((p) => (
            <li key={p.username} className={p.isMe ? 'me' : undefined}>
              <span className="weekly-rank">{faNumber(p.rank)}</span>
              <span className="weekly-name" dir="auto">
                {p.username}
              </span>
              <span className="weekly-games">{faNumber(p.games)} بازی</span>
              <b className="weekly-points">{faNumber(p.points)}</b>
            </li>
          ))}
        </ol>
      )}
      {board.totalPlayers > board.top.length && (
        <p className="weekly-more">و {faNumber(board.totalPlayers - board.top.length)} نفر دیگه</p>
      )}

      <details className="weekly-rules">
        <summary>امتیاز چطور حساب می‌شه؟</summary>
        <p>
          هر بازی روزانه که تمومش کنی <b>۱۰</b> امتیاز، اگه ببری <b>۱۰</b> امتیاز دیگه و اگه عالی ببری <b>۱۰</b> امتیاز دیگه
          (هر بازی روزی حداکثر ۳۰). جدول شنبه‌ها از صفر شروع می‌شه و فقط کاربرهای واردشده توشن.
        </p>
        <div className="weekly-rules-table" role="table" aria-label="شرط هر بازی">
          <div role="row" className="weekly-rules-head">
            <span role="columnheader">بازی</span>
            <span role="columnheader">تموم</span>
            <span role="columnheader">برد</span>
            <span role="columnheader">عالی</span>
          </div>
          {RULES.map((r) => (
            <div role="row" key={r[0]}>
              {r.map((cell, i) => (
                <span role="cell" key={i}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </details>
    </main>
  )
}

export default WeeklyPage
