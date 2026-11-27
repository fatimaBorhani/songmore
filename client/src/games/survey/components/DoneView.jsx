// آخر سؤال‌های امروز (طرح «ج»): کارت آبی با تیک‌ها، «دمت گرم!» و هدف جمعی؛ زیرش «یه سؤال پیشنهاد بده» (پنجره) و «۵ تای دیگه!» (عددش از moreCount)
import { useState } from 'react'
import { faNumber } from '../../../shared/format.js'
import GoalBar from './GoalBar.jsx'
import SuggestDialog from './SuggestDialog.jsx'

// تیک‌های کج بالای کارت (فقط تزئین)
const TILTS = [-8, 5, -3, 7, -6]

function DoneView({ title, helpButton, state, busy, error, onMore, onReset }) {
  const { todayAnswered, canMore, goal, moreCount, dailyCount, testMode } = state
  const [suggesting, setSuggesting] = useState(false)

  const headline = !canMore
    ? 'همه‌ی سؤال‌ها رو جواب دادی!'
    : todayAnswered > 0
      ? `${faNumber(todayAnswered)} تا جواب امروز، دمت گرم!`
      : 'امروز تموم شد!'

  return (
    <main className="survey-page">
      <header className="survey-top">
        <h1 className="game-title">{title}</h1>
        {helpButton}
      </header>

      <section className="survey-done-card" aria-label="آخر امروز">
        <div className="survey-ticks" aria-hidden="true">
          {TILTS.map((deg) => (
            <span key={deg} style={{ transform: `rotate(${deg}deg)` }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          ))}
        </div>
        <h2>{headline}</h2>
        <p>{canMore ? `فردا ${faNumber(dailyCount)} سؤال تازه داریم` : 'سؤال‌های تازه به‌زودی میان'}</p>
        <GoalBar goal={goal} onBlue />
      </section>

      {error && (
        <p className="survey-error" role="alert">
          {error}
        </p>
      )}

      <div className="survey-done-actions">
        <button type="button" className="survey-ghost" onClick={() => setSuggesting(true)}>
          یه سؤال پیشنهاد بده
        </button>
        {canMore && (
          <button type="button" className="survey-more" disabled={busy} onClick={onMore} aria-label={`${faNumber(moreCount)} سؤال دیگه`}>
            {faNumber(moreCount)} تای دیگه!
          </button>
        )}
      </div>

      {testMode && (
        <button type="button" className="ghost-button survey-test" disabled={busy} onClick={onReset}>
          بازی دوباره (تست)
        </button>
      )}

      {suggesting && <SuggestDialog onClose={() => setSuggesting(false)} />}
    </main>
  )
}

export default DoneView
