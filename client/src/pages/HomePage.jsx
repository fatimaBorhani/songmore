import { useEffect } from 'react'
import { Link } from 'react-router'
import { GAMES } from '../games/index.js'
import { SITE_NAME } from '../shared/site.js'
import Countdown from '../shared/components/Countdown.jsx'
import './home.css'
import './about.css'

// آیکن کوچیک هر بازی (خطی، به رنگ متن)
function GameIcon({ type, size = 24 }) {
  if (type === 'wave') {
    return (
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
      </svg>
    )
  }
  if (type === 'palette') {
    return (
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2z" />
        <circle cx="7.5" cy="11" r="1" />
        <circle cx="10.5" cy="7.5" r="1" />
        <circle cx="15" cy="7.5" r="1" />
      </svg>
    )
  }
  if (type === 'search') {
    return (
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
    )
  }
  if (type === 'chat') {
    return (
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        <path d="M9 11h6M9 14h4" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

// گرامافون گوشه‌ی کارت آبی (فقط CSS؛ فقط حلقه‌ی برق می‌چرخه)
function Record() {
  return (
    <span className="record" aria-hidden="true">
      <span className="record-groove g1" />
      <span className="record-groove g2" />
      <span className="record-groove g3" />
      <span className="record-shine" />
      <span className="record-label">
        <GameIcon type="wave" size={30} />
      </span>
    </span>
  )
}

// کارت بزرگ آبی (بازی‌ای که توی games/index.js «featured» داره)
function FeaturedCard({ game }) {
  const body = (
    <>
      <span className="featured-text">
        <span className="featured-title">{game.title}</span>
        <span className="featured-desc">{game.description}</span>
      </span>
      {game.ready ? (
        <span className="featured-cta">{game.cta ?? 'بازی کن ←'}</span>
      ) : (
        <span className="featured-cta">به‌زودی</span>
      )}
      <Record />
    </>
  )
  return game.ready ? (
    <Link to={game.path} className="bento-card featured">
      {body}
    </Link>
  ) : (
    <div className="bento-card featured soon" aria-disabled="true">
      {body}
    </div>
  )
}

// کارت کوچیک تیره
function SmallCard({ game }) {
  const body = (
    <>
      <span className="small-icon">
        <GameIcon type={game.icon} />
      </span>
      <span className="small-title">{game.title}</span>
      <span className="small-desc">{game.description}</span>
      {game.ready ? (
        <span className="small-cta">{game.cta ?? 'بازی کن ←'}</span>
      ) : (
        <span className="small-badge">به‌زودی</span>
      )}
    </>
  )
  return game.ready ? (
    <Link to={game.path} className="bento-card small">
      {body}
    </Link>
  ) : (
    <div className="bento-card small soon" aria-disabled="true">
      {body}
    </div>
  )
}

// صفحه‌ی اول: چینش بنتو؛ کارت‌ها و ترتیبشون از games/index.js میان
function HomePage() {
  useEffect(() => {
    document.title = SITE_NAME
  }, [])

  return (
    <main className="home-bento-page">
      <section className="home-title-row">
        <h1>امروز چی بازی کنیم؟</h1>
        <p className="home-countdown">
          <span className="home-sr-only">بازی‌های بعدی تا </span>
          <span dir="ltr">
            <Countdown />
          </span>
        </p>
      </section>

      <ul className="bento">
        {GAMES.map((game) => (
          <li key={game.id} className={game.featured ? 'bento-item featured' : 'bento-item'}>
            {game.featured ? <FeaturedCard game={game} /> : <SmallCard game={game} />}
          </li>
        ))}
      </ul>

      <Link to="/about" className="home-about-link">
        درباره‌ی سایت
      </Link>
    </main>
  )
}

export default HomePage
