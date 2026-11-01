// خلاصه‌ی آمار بازیکن (فقط روی همین مرورگر)
function StatsPanel({ stats }) {
  const winPercent = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0

  const rows = [
    { label: 'بازی‌ها', value: stats.played },
    { label: 'درصد برد', value: `${winPercent}%` },
    { label: 'رکورد فعلی', value: stats.currentStreak },
    { label: 'بهترین رکورد', value: stats.maxStreak },
  ]

  return (
    <div className="stats-panel">
      {rows.map((row) => (
        <div key={row.label} className="stat">
          <div className="stat-value">{row.value}</div>
          <div className="stat-label">{row.label}</div>
        </div>
      ))}
    </div>
  )
}

export default StatsPanel
