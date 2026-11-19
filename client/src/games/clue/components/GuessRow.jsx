import { fillPercent, heatOf, rankLabel } from '../clue.js'

// یه ردیف حدس: کلمه و رتبه؛ ردیف مثل نوار پیشرفت به اندازه‌ی نزدیکی رنگ می‌خوره
// (دورها فقط یه نوار باریک کنارشون دارن). latest = آخرین حدس (فلش کنارش)
function GuessRow({ guess, latest = false }) {
  const fill = fillPercent(guess.rank)
  return (
    <div className={`clue-row heat-${heatOf(guess.rank)}${fill ? ' filled' : ''}`} style={{ '--fill': `${fill}%` }}>
      {latest && <span className="clue-row-marker" aria-label="آخرین حدس" />}
      <span className="clue-row-word">
        {guess.word}
        {guess.hint && (
          <svg role="img" aria-label="از راهنما" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 21h4" />
            <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
          </svg>
        )}
      </span>
      <span className="clue-row-rank">{rankLabel(guess.rank)}</span>
    </div>
  )
}

export default GuessRow
