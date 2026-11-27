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
            {/* کتاب باز: «راهنما»ی خود بازی (کلمه‌ی نزدیک‌تر)؛ چراغ فقط مال راهنمای قوانین بازی‌هاست */}
            <path d="M2 5c3-1.5 6.5-1.5 10 1 3.5-2.5 7-2.5 10-1v14c-3-1.5-6.5-1.5-10 1-3.5-2.5-7-2.5-10-1z" />
            <path d="M12 6v14" />
          </svg>
        )}
      </span>
      <span className="clue-row-rank">{rankLabel(guess.rank)}</span>
    </div>
  )
}

export default GuessRow
