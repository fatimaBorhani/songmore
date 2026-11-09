const RESULT_LABEL = {
  correct: 'درسته',
  present: 'خواننده درسته',
  incorrect: 'غلط',
}

// فقط حدس‌های واقعی رو نشون می‌ده؛ «رد کردن»ها فقط روی نوار پخش دیده می‌شن
// celebrating: وقتی تازه درست حدس زده، ردیف درست یه بار نبض می‌زنه
function GuessHistory({ guesses, celebrating }) {
  const realGuesses = guesses.filter((g) => g.result !== 'skipped' && g.result !== 'gaveup')
  if (realGuesses.length === 0) return null

  return (
    <ol className="guess-history" aria-label="حدس‌ها">
      {realGuesses.map((guess) => (
        <li
          key={guess.guess_number}
          className={`${guess.result} ${celebrating && guess.result === 'correct' ? 'celebrate' : ''}`}
        >
          {guess.result === 'correct' ? (
            // حدس درست: تیک سفید توی دایره‌ی آبی
            <span className="guess-check" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          ) : (
            <span className="guess-dot" aria-hidden="true" />
          )}
          <span className="guess-text">{guess.guess_text}</span>
          <span className="guess-label">{RESULT_LABEL[guess.result]}</span>
        </li>
      ))}
    </ol>
  )
}

export default GuessHistory
