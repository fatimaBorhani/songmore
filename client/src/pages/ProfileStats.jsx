// پنل‌های آمار هر بخش توی صفحه‌ی حساب: جورچین، جورنگ، جوربندی و نظرسنجی
import { Link } from 'react-router'
import { faNumber } from '../shared/format.js'
import GoalBar from '../games/survey/components/GoalBar.jsx'
import BadgeGrid from './BadgeGrid.jsx'

// لیست «اسم / عدد»؛ total = ردیف درشت آخر
function StatsList({ label, rows, total }) {
  return (
    <section className="profile-card profile-stats" aria-label={label}>
      <dl>
        {rows.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className="total">
          <dt>{total[0]}</dt>
          <dd>{total[1]}</dd>
        </div>
      </dl>
    </section>
  )
}

// وقتی هنوز چیزی بازی نشده
function EmptyStats({ text, to, linkText }) {
  return (
    <section className="profile-card profile-soon">
      <p>{text}</p>
      <Link to={to} className="ghost-button">
        {linkText}
      </Link>
    </section>
  )
}

const withOf = (value, of) => (
  <>
    {value} <small>از {of}</small>
  </>
)

export function WordStatsPanel({ stats }) {
  if (stats.played === 0) return <EmptyStats text="هنوز جورچین بازی نکردی." to="/word" linkText="برو به جورچین" />
  const winPercent = Math.round((stats.wins / stats.played) * 100)
  const rows = [
    ['کلمه‌های تموم‌شده', faNumber(stats.played)],
    ['درصد برد', `${faNumber(winPercent)}٪`],
    ['رکورد فعلی', faNumber(stats.currentStreak)],
    ['بهترین رکورد', faNumber(stats.maxStreak)],
    ['میانگین حدس برای بردها', faNumber(stats.averageGuesses, 1)],
    ['پیداشده با ادامه دادن', faNumber(stats.lateSolved)],
    ...stats.byLength.map((l) => [`${faNumber(l.length)} حرفی`, `${faNumber(l.wins)} برد از ${faNumber(l.played)}`]),
  ]
  const most = Math.max(...stats.distribution, 1)
  return (
    <div className="profile-panels">
      <StatsList label="آمار جورچین" rows={rows} total={['بردها', withOf(faNumber(stats.wins), faNumber(stats.played))]} />
      <section className="profile-card profile-dist" aria-label="توزیع حدس‌ها">
        <h2>بردها با چند حدس؟</h2>
        <ol>
          {stats.distribution.map((count, i) => (
            <li key={i}>
              <span>{faNumber(i + 1)}</span>
              <div className="profile-dist-bar">
                <div style={{ width: `${count > 0 ? Math.max((count / most) * 100, 8) : 0}%` }} />
              </div>
              <b>{faNumber(count)}</b>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

export function ColorStatsPanel({ stats }) {
  if (stats.played === 0) return <EmptyStats text="هنوز جورنگ رو تموم نکردی." to="/color" linkText="برو به جورنگ" />
  const rows = [
    ['بازی‌های تموم‌شده', faNumber(stats.played)],
    ['میانگین امتیاز هر بازی', `${faNumber(stats.averageTotal, 2)} از ${faNumber(stats.maxTotal)}`],
    ['بهترین بازی', faNumber(stats.bestTotal, 2)],
    ['میانگین هر دور', faNumber(stats.averageRound, 2)],
    ['بهترین دور', faNumber(stats.bestRound, 2)],
    ['روزهای پشت‌سرهم', faNumber(stats.currentStreak)],
    ['بهترین رکورد', faNumber(stats.maxStreak)],
  ]
  return (
    <div className="profile-panels">
      <StatsList label="آمار جورنگ" rows={rows} total={['مجموع امتیاز', faNumber(stats.totalScore, 2)]} />
    </div>
  )
}

export function ClueStatsPanel({ stats }) {
  if (stats.played === 0) return <EmptyStats text="هنوز جوربندی رو تموم نکردی." to="/clue" linkText="برو به جوربندی" />
  const rows = [
    ['روزهای بازی‌شده', faNumber(stats.played)],
    ['تسلیم', faNumber(stats.gaveUps)],
    ['میانگین حدس برای پیدا کردن', stats.wins ? faNumber(stats.averageGuesses, 1) : '—'],
    ['کمترین حدس', stats.wins ? faNumber(stats.bestGuesses) : '—'],
    ['پیدا کردن بدون راهنما', faNumber(stats.noHintWins)],
    ['راهنماهای گرفته‌شده', faNumber(stats.totalHints)],
    ['روزهای پشت‌سرهم', faNumber(stats.currentStreak)],
    ['بهترین رکورد', faNumber(stats.maxStreak)],
  ]
  return (
    <div className="profile-panels">
      <StatsList label="آمار جوربندی" rows={rows} total={['پیدا کردی', withOf(faNumber(stats.wins), faNumber(stats.played))]} />
    </div>
  )
}

export function LyricsStatsPanel({ stats }) {
  if (stats.songs === 0) return <EmptyStats text="هنوز جورشعر بازی نکردی." to="/lyrics" linkText="برو به جورشعر" />
  const rows = [
    ['آهنگ‌های جواب‌داده', faNumber(stats.songs)],
    ['میانگین امتیاز هر روز', stats.played ? withOf(faNumber(stats.averageDay, Number.isInteger(stats.averageDay) ? 0 : 1), faNumber(stats.maxDay)) : '—'],
    ['بهترین روز', stats.played ? withOf(faNumber(stats.bestDay), faNumber(stats.maxDay)) : '—'],
    ['آهنگ‌هایی که هر دو خطش درست بود', faNumber(stats.perfectSongs)],
    ['خط‌های درست', faNumber(stats.okLines)],
    ['خط‌های نزدیک', faNumber(stats.closeLines)],
    ['خط‌های غلط', faNumber(stats.wrongLines)],
    ['روزهای پشت‌سرهم', faNumber(stats.currentStreak)],
    ['بهترین رکورد', faNumber(stats.maxStreak)],
  ]
  return (
    <div className="profile-panels">
      <StatsList label="آمار جورشعر" rows={rows} total={['روزهای تموم‌شده', faNumber(stats.played)]} />
    </div>
  )
}

export function SurveyStatsPanel({ stats }) {
  if (stats.answered === 0 && stats.skipped === 0) {
    return <EmptyStats text="هنوز به سؤالی جواب ندادی." to="/survey" linkText="برو به نظرسنجی" />
  }
  const rows = [
    ['امروز', faNumber(stats.today)],
    ['سؤال ردشده', faNumber(stats.skipped)],
    ['روزهایی که جواب دادی', faNumber(stats.days)],
    ['سؤال پیشنهادی', faNumber(stats.suggestions)],
  ]
  return (
    <div className="profile-panels">
      <StatsList label="آمار نظرسنجی" rows={rows} total={['سؤال‌های جواب‌داده', withOf(faNumber(stats.answered), faNumber(stats.totalQuestions))]} />
      <GoalBar goal={stats.goal} />
      <BadgeGrid badges={stats.badges} />
    </div>
  )
}
