// یه سؤال روی صفحه: متن سؤال، جعبه‌ی جواب، «رد کردن» و «ثبت»
import { useState } from 'react'
import { faNumber } from '../../../shared/format.js'
import GoalBar from './GoalBar.jsx'

const MAX_ANSWER_LENGTH = 60 // همون حد سرور

function QuestionView({ title, state, busy, error, onSubmit, onSkip }) {
  const { current, batch, goal } = state
  const [answer, setAnswer] = useState('')
  const canSubmit = answer.trim().length > 0 && !busy
  const isLast = current.number === current.batchSize

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
        <p className="survey-caption">
          سؤال {faNumber(current.number)} از {faNumber(current.batchSize)} · {batch === 0 ? 'سؤال‌های امروز' : 'سؤال‌های بیشتر'}
        </p>
      </header>

      <section className="survey-card" aria-label="سؤال">
        <span className="survey-chip">{current.category}</span>
        <h2 className="survey-question">{current.text}</h2>
        <p className="survey-hint">اولین چیزی که به ذهنت میاد رو بنویس. جواب درست و غلط نداره.</p>
      </section>

      <form className="survey-form" onSubmit={handleSubmit}>
        <label htmlFor="survey-answer">جواب تو</label>
        <input
          id="survey-answer"
          className="survey-input"
          type="text"
          value={answer}
          maxLength={MAX_ANSWER_LENGTH}
          placeholder="اینجا بنویس…"
          autoComplete="off"
          autoFocus
          enterKeyHint="send"
          onChange={(e) => setAnswer(e.target.value)}
        />
        {error && (
          <p className="survey-error" role="alert">
            {error}
          </p>
        )}
        <div className="survey-actions">
          <button type="button" className="survey-skip" disabled={busy} onClick={onSkip}>
            رد کردن
          </button>
          <button type="submit" className="survey-submit" disabled={!canSubmit}>
            {isLast ? 'ثبت' : 'ثبت و سؤال بعدی'}
          </button>
        </div>
      </form>

      <p className="survey-note">جواب‌ها ناشناس ذخیره می‌شن و برای ساختن بازی بعدی استفاده می‌شن.</p>
      <GoalBar goal={goal} compact />
    </main>
  )
}

export default QuestionView
