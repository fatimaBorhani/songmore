// پایان بازی: جمع امتیاز، فهرست دورها (رنگ اصلی و رنگ تو)، اشتراک و زمان تا بازی بعدی
import { faNumber } from '../../../shared/format.js'
import Countdown from '../../../shared/components/Countdown.jsx'
import { faScore, hsbToCss } from '../color.js'

function SummaryView({ game, onShare, testMode, onReplay }) {
  return (
    <div className="color-summary">
      <section className="color-card color-summary-total" aria-live="polite">
        <span className="color-summary-label">امتیاز امروز</span>
        <span className="color-summary-score">
          {faScore(game.total)} <small>از {faNumber(game.maxTotal)}</small>
        </span>
        <div className="color-bar" role="img" aria-label={`${faNumber(Math.round((game.total / game.maxTotal) * 100))} درصد`}>
          <div style={{ width: `${(game.total / game.maxTotal) * 100}%` }} />
        </div>
      </section>

      <ol className="color-rounds" aria-label="امتیاز دورها">
        {game.rounds.map((r) => (
          <li key={r.round}>
            <span className="color-mini-circle" role="img" aria-label="رنگ اصلی و رنگ تو">
              <i style={{ background: hsbToCss(r.target) }} />
              <i style={{ background: hsbToCss(r.guess) }} />
            </span>
            <span className="color-round-name">دور {faNumber(r.round)}</span>
            <b>{faScore(r.score)}</b>
          </li>
        ))}
      </ol>

      <div className="color-summary-actions">
        <button type="button" className="color-btn" onClick={onShare}>
          اشتراک نتیجه
        </button>
        {testMode && (
          <button type="button" className="color-btn ghost" onClick={onReplay}>
            بازی دوباره (تست)
          </button>
        )}
      </div>

      <p className="color-next-game">
        رنگ‌های بعدی تا <Countdown />
      </p>
    </div>
  )
}

export default SummaryView
