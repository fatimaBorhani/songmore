const RESULT_LABEL = {
  correct: 'درست',
  present: 'خواننده مشترک',
  incorrect: 'غلط',
}

// فقط حدس‌های واقعی رو نشون می‌ده؛ «رد کردن»ها فقط روی نوار پخش دیده می‌شن
function GuessHistory({ guesses }) {
  const realGuesses = guesses.filter((g) => g.result !== 'skipped')
  if (realGuesses.length === 0) return null

  return (
    <ol className="guess-history" aria-label="حدس‌ها">
      {realGuesses.map((guess) => (
        <li key={guess.guess_number} className={guess.result}>
          <span className="guess-dot" aria-hidden="true" />
          <span className="guess-text">{guess.guess_text}</span>
          <span className="guess-label">{RESULT_LABEL[guess.result]}</span>
        </li>
      ))}
    </ol>
  )
}

export default GuessHistory
