import { useEffect } from 'react'
import { Link } from 'react-router'
import { GAMES } from '../games/index.js'
import { SITE_NAME } from '../shared/site.js'
import Countdown from '../shared/components/Countdown.jsx'
import GameIcon from '../shared/components/GameIcon.jsx'
import './home.css'
import './about.css'

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
      <span className="small-title">
        {game.title}
        {game.beta && <span className="beta-badge">آزمایشی</span>}
      </span>
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
