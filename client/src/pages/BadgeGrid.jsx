// بج‌های مشارکت (از سرور میان: { id, title, description, earned, progress, target, showProgress })
import { faNumber } from '../shared/format.js'

const SVG = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

// آیکن توی دایره‌ی هر بج: بج‌های تعداد سؤال خود عددشون رو نشون می‌دن
function BadgeIcon({ badge }) {
  if (['q10', 'q50', 'q100'].includes(badge.id)) return <b className="profile-badge-num">{faNumber(badge.target)}</b>
  if (badge.id === 'first') {
    return (
      <svg {...SVG}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    )
  }
  if (badge.id === 'days3' || badge.id === 'days7') {
    return (
      <svg {...SVG}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </svg>
    )
  }
  if (badge.id === 'more') {
    return (
      <svg {...SVG}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    )
  }
  if (badge.id === 'suggest') {
    return (
      <svg {...SVG}>
        <path d="M9 18h6M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.2 1.1 2V16h5v-.2c0-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z" />
      </svg>
    )
  }
  return (
    <svg {...SVG}>
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />
    </svg>
  )
}

function BadgeGrid({ badges }) {
  const earnedCount = badges.filter((b) => b.earned).length
  return (
    <section className="profile-card profile-badges" aria-label="بج‌ها">
      <header>
        <h2>بج‌ها</h2>
        <span>
          {faNumber(earnedCount)} از {faNumber(badges.length)}
        </span>
      </header>
      <ul>
        {badges.map((b) => (
          <li key={b.id} className={`profile-badge${b.earned ? ' earned' : ''}`}>
            <span className="profile-badge-disc">
              <BadgeIcon badge={b} />
            </span>
            <b className="profile-badge-title">{b.title}</b>
            <p>{b.description}</p>
            {b.earned ? (
              <span className="profile-badge-state">گرفتی</span>
            ) : b.showProgress ? (
              <div className="profile-badge-progress">
                <div className="profile-badge-bar" role="img" aria-label={`${faNumber(b.progress)} از ${faNumber(b.target)}`}>
                  <div style={{ width: `${(b.progress / b.target) * 100}%` }} />
                </div>
                <span>
                  {faNumber(b.progress)} از {faNumber(b.target)}
                </span>
              </div>
            ) : (
              <span className="profile-badge-state locked">هنوز نه</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default BadgeGrid
