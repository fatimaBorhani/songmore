import { faNumber } from '../stages.js'

// خلاصه‌ی آمار بازیکن: ردیف اول بازی‌ها و رکوردها، ردیف دوم امتیازها
function StatsPanel({ stats }) {
  const winPercent = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0

  const rows = [
    { label: 'بازی‌ها', value: faNumber(stats.played) },
    { label: 'درصد برد', value: `${faNumber(winPercent)}٪` },
    { label: 'رکورد فعلی', value: faNumber(stats.currentStreak) },
    { label: 'بهترین رکورد', value: faNumber(stats.maxStreak) },
  ]
  const scoreRows = [
    { label: 'مجموع امتیاز', value: faNumber(stats.totalScore ?? 0) },
    { label: 'میانگین امتیاز', value: faNumber(stats.averageScore ?? 0) },
    { label: 'بهترین امتیاز', value: faNumber(stats.bestScore ?? 0) },
  ]

  return (
    <div className="stats">
      <div className="stats-panel">
        {rows.map((row) => (
          <div key={row.label} className="stat">
            <div className="stat-value">{row.value}</div>
            <div className="stat-label">{row.label}</div>
          </div>
        ))}
      </div>
      <div className="stats-panel scores">
        {scoreRows.map((row) => (
          <div key={row.label} className="stat">
            <div className="stat-value">{row.value}</div>
            <div className="stat-label">{row.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StatsPanel
