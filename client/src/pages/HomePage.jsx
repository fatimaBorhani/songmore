import { useEffect } from 'react'
import { Link } from 'react-router'
import { GAMES } from '../games/index.js'
import { SITE_NAME } from '../shared/site.js'
import './home.css'

// آیکن کوچیک هر بازی (خطی، به رنگ متن)
function GameIcon({ type }) {
  if (type === 'wave') {
    return (
      <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

// صفحه‌ی اول: کاربر انتخاب می‌کنه کدوم بازی رو بازی کنه
function HomePage() {
  useEffect(() => {
    document.title = SITE_NAME
  }, [])

  return (
    <main className="home-page">
      <header className="home-header">
        <h1>امروز چی بازی کنیم؟</h1>
        <p>هر روز یه معمای تازه. هر کدوم رو خواستی انتخاب کن.</p>
      </header>

      <ul className="game-cards">
        {GAMES.map((game) => (
          <li key={game.id}>
            {game.ready ? (
              <Link to={game.path} className="game-card">
                <span className="game-card-icon">
                  <GameIcon type={game.icon} />
                </span>
                <span className="game-card-title">{game.title}</span>
                <span className="game-card-desc">{game.description}</span>
                <span className="game-card-cta">بازی کن ←</span>
              </Link>
            ) : (
              <div className="game-card soon" aria-disabled="true">
                <span className="game-card-icon">
                  <GameIcon type={game.icon} />
                </span>
                <span className="game-card-title">{game.title}</span>
                <span className="game-card-desc">{game.description}</span>
                <span className="game-card-badge">به‌زودی</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default HomePage
