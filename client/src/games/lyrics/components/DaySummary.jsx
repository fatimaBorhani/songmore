import Countdown from '../../../shared/components/Countdown.jsx'
import { faNumber } from '../../../shared/format.js'
import { dayVerdict, GRADE_LABELS } from '../lyrics.js'

// خلاصه‌ی روز: امتیاز کل، ۳ ردیف آهنگ (مربع هر خط و امتیاز)، «کپی نتیجه» و ساعت
function DaySummary({ game, message, onShare }) {
  return (
    <div className="lyrics-summary">
      <section className="lyrics-dayhero" aria-label="امتیاز امروز">
        <div className="lyrics-score big">
          <b>{faNumber(game.dayPoints)}</b>
          <small>از {faNumber(game.maxPoints)}</small>
        </div>
        <div className="lyrics-dayhero-text">
          <span>امتیاز امروز</span>
          <b>{dayVerdict(game.dayPoints, game.maxPoints)}</b>
        </div>
      </section>
      <ol className="lyrics-daylist">
        {game.slots.map((s) => (
          <li key={s.slot}>
            <span className="lyrics-daynum">{faNumber(s.slot)}</span>
            <span className="lyrics-dayname">
              <b>{s.title}</b>
              <small>{s.artist}</small>
            </span>
            <span className="lyrics-minis" role="img" aria-label={(s.grades || []).map((g) => GRADE_LABELS[g]).join('، ')}>
              {(s.grades || []).map((g, i) => (
                <i key={i} className={g} />
              ))}
            </span>
            <b className="lyrics-daypoints">{faNumber(s.points ?? 0)}</b>
          </li>
        ))}
      </ol>
      <div className="lyrics-summary-actions">
        <button type="button" className="lyrics-share" onClick={onShare}>
          کپی نتیجه
        </button>
        {message && (
          <p className="lyrics-message" role="status">
            {message}
          </p>
        )}
        <p className="lyrics-next-day">
          ترانه‌های بعدی تا <Countdown />
        </p>
      </div>
    </div>
  )
}

export default DaySummary
