// یه سؤال روی صفحه (طرح «ج»): کارت تیره با سؤال درشت و «۱۰۰» کم‌رنگ پشتش، جای جواب گرد با دکمه‌ی فلش
// رد کردن نداریم؛ توضیح‌ها فقط توی راهنمای چراغه
import { useState } from 'react'
import { faNumber } from '../../../shared/format.js'
import GoalBar from './GoalBar.jsx'

const MAX_ANSWER_LENGTH = 60 // همون حد سرور

function QuestionView({ title, helpButton, state, busy, error, onSubmit }) {
  const { current, goal } = state
  const [answer, setAnswer] = useState('')
  const canSubmit = answer.trim().length > 0 && !busy

  function handleSubmit(e) {
    e.preventDefault()
    if (canSubmit) onSubmit(answer)
  }

  return (
    <main className="survey-page">
      <header className="survey-top">
        <h1>{title}</h1>
        <div className="survey-dots" role="img" aria-label={`سؤال ${faNumber(current.number)} از ${faNumber(current.batchSize)}`}>
          {Array.from({ length: current.batchSize }, (_, i) => (
            <span key={i} className={i + 1 < current.number ? 'done' : i + 1 === current.number ? 'current' : ''} />
          ))}
        </div>
        {helpButton}
      </header>

      <section className="survey-card" aria-label="سؤال">
        <span className="survey-card-bg" aria-hidden="true">
          {faNumber(100)}
        </span>
        <span className="survey-chip">{current.category}</span>
        <h2 className="survey-question">{current.text}</h2>
        <span className="survey-tagline">{faNumber(100)} نفر جواب می‌دن… تو چی می‌گی؟</span>
      </section>

      <form className="survey-form" onSubmit={handleSubmit}>
        <label className="survey-answer">
          <span className="survey-sr-only">جواب تو</span>
          <input
            className="survey-input"
            type="text"
            value={answer}
            maxLength={MAX_ANSWER_LENGTH}
            placeholder="جوابت رو بنویس…"
            autoComplete="off"
            autoFocus
            enterKeyHint="send"
            onChange={(e) => setAnswer(e.target.value)}
          />
          <button type="submit" className="survey-send" disabled={!canSubmit} aria-label="ثبت جواب">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
        </label>
        {error && (
          <p className="survey-error" role="alert">
            {error}
          </p>
        )}
      </form>

      <GoalBar goal={goal} />
    </main>
  )
}

export default QuestionView
