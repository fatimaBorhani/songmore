import { useEffect, useState } from 'react'
import { faNumber } from '../format.js'

// جدول امتیاز امروز (۲۰ نفر اول + رتبه‌ی خودت اگه بیرون از ۲۰ نفری)؛ مشترک بین بازی‌ها
// load: تابعی که جدول همون بازی رو از سرور می‌گیره (مثلاً getTodayLeaderboard بازی آهنگ)
// refreshKey: هر وقت عوض بشه (ورود/خروج، تموم شدن بازی) جدول دوباره گرفته می‌شه
function Leaderboard({ user, load, refreshKey }) {
  const [board, setBoard] = useState(null)

  useEffect(() => {
    let cancelled = false
    load()
      .then((data) => {
        if (!cancelled) setBoard(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [load, refreshKey])

  if (!board) return null

  const meOutsideTop = board.me && !board.top.some((p) => p.isMe)

  return (
    <section className="leaderboard" aria-label="جدول امتیاز امروز">
      <div className="leaderboard-head">
        <h3>جدول امتیاز امروز</h3>
        <span>{faNumber(board.totalPlayers)} نفر</span>
      </div>

      {board.top.length === 0 ? (
        <p className="leaderboard-empty">هنوز کسی بازی امروز رو تموم نکرده.</p>
      ) : (
        <ol className="leaderboard-list">
          {board.top.map((p) => (
            <li key={p.rank} className={p.isMe ? 'me' : ''}>
              <span className="lb-rank">{faNumber(p.rank)}</span>
              <bdi className="lb-name">{p.username}</bdi>
              <span className="lb-score">{faNumber(p.score)}</span>
            </li>
          ))}
          {meOutsideTop && (
            <li className="me">
              <span className="lb-rank">{faNumber(board.me.rank)}</span>
              <bdi className="lb-name">{user?.username}</bdi>
              <span className="lb-score">{faNumber(board.me.score)}</span>
            </li>
          )}
        </ol>
      )}

      {!user && <p className="leaderboard-hint">برای اینکه اسمت توی جدول بیاد، حساب بساز.</p>}
    </section>
  )
}

export default Leaderboard
