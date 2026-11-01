const RESULT_EMOJI = {
  correct: '🟩',
  present: '🟨',
  incorrect: '🟥',
  skipped: '⬜',
}

const RESULT_LABEL = {
  correct: 'درست',
  present: 'خواننده مشترک',
  incorrect: 'غلط',
  skipped: 'رد شد',
}

// ۵ ردیف حدس؛ ردیف‌هایی که هنوز حدس زده نشدن خالی (⬛) نشون داده می‌شن
function GuessHistory({ guesses }) {
  const rows = Array.from({ length: 5 }, (_, i) => guesses[i] || null)

  return (
    <ol className="guess-history">
      {rows.map((guess, i) => (
        <li key={i} className={guess ? guess.result : 'empty'}>
          <span className="square">{guess ? RESULT_EMOJI[guess.result] : '⬛'}</span>
          <span className="guess-text">{guess ? guess.guess_text : '—'}</span>
          {guess && <span className="guess-label">{RESULT_LABEL[guess.result]}</span>}
        </li>
      ))}
    </ol>
  )
}

export default GuessHistory
