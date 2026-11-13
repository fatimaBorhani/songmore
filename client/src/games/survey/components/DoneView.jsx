// بعد از آخرین سؤال: تشکر، هدف جمعی، «۵ سؤال دیگه» (اختیاری) و پیشنهاد سؤال
import { useState } from 'react'
import { Link } from 'react-router'
import { faNumber } from '../../../shared/format.js'
import { sendSuggestion } from '../api.js'
import GoalBar from './GoalBar.jsx'

const SUGGEST_ERRORS = {
  INVALID_SUGGESTION: 'سؤال باید بین ۱۰ تا ۲۰۰ حرف باشه.',
  TOO_MANY_SUGGESTIONS: 'امروز به اندازه‌ی کافی پیشنهاد دادی. فردا دوباره امتحان کن.',
}

function DoneView({ title, state, busy, error, onMore, onReset }) {
  const { todayAnswered, canMore, goal, moreCount, dailyCount, testMode } = state
  const [text, setText] = useState('')
  const [suggestState, setSuggestState] = useState({ status: 'idle', message: '' }) // idle | sending | sent | error

  async function handleSuggest(e) {
    e.preventDefault()
    if (!text.trim() || suggestState.status === 'sending') return
    setSuggestState({ status: 'sending', message: '' })
    try {
      await sendSuggestion(text)
      setText('')
      setSuggestState({ status: 'sent', message: 'ممنون! سؤالت ثبت شد.' })
    } catch (err) {
      setSuggestState({ status: 'error', message: SUGGEST_ERRORS[err.message] || err.message })
    }
  }

  return (
    <main className="survey-page">
      <header className="survey-done-top">
        <span className="survey-done-icon" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h1>{todayAnswered > 0 ? 'ممنون! جواب‌هات ثبت شد' : title}</h1>
        <p>
          {!canMore
            ? 'همه‌ی سؤال‌های فعلی رو جواب دادی. سؤال‌های تازه به‌زودی میان.'
            : todayAnswered > 0
              ? `امروز ${faNumber(todayAnswered)} سؤال رو جواب دادی. فردا ${faNumber(dailyCount)} سؤال تازه میاد.`
              : `فردا ${faNumber(dailyCount)} سؤال تازه میاد.`}
        </p>
      </header>

      <GoalBar goal={goal} />

      <section className="survey-suggest" aria-label="پیشنهاد سؤال">
        <h2>یه سؤال پیشنهاد بده</h2>
        <form onSubmit={handleSuggest}>
          <label htmlFor="survey-suggest">سؤالی که دوست داری بقیه جواب بدن</label>
          <textarea
            id="survey-suggest"
            rows={2}
            maxLength={200}
            value={text}
            placeholder="مثلاً: یه چیزی که توی کوله‌ی کوهنوردی می‌ذارن"
            onChange={(e) => {
              setText(e.target.value)
              if (suggestState.status !== 'sending') setSuggestState({ status: 'idle', message: '' })
            }}
          />
          <button type="submit" className="survey-secondary" disabled={!text.trim() || suggestState.status === 'sending'}>
            بفرست
          </button>
          {suggestState.message && (
            <p className={suggestState.status === 'error' ? 'survey-error' : 'survey-ok'} role="status">
              {suggestState.message}
            </p>
          )}
        </form>
      </section>

      <div className="survey-done-actions">
        {error && (
          <p className="survey-error" role="alert">
            {error}
          </p>
        )}
        {canMore && (
          <>
            <p className="survey-note">اختیاریه. هر چقدر خواستی ادامه بده؛ اول سؤال‌هایی میان که بیشتر به کامل شدن نزدیکن.</p>
            <button type="button" className="survey-submit" disabled={busy} onClick={onMore}>
              {faNumber(moreCount)} سؤال دیگه جواب می‌دم
            </button>
          </>
        )}
        <Link to="/" className="survey-home">
          برگرد به صفحه‌ی اول
        </Link>
        {testMode && (
          <button type="button" className="ghost-button" disabled={busy} onClick={onReset}>
            بازی دوباره (تست)
          </button>
        )}
      </div>
    </main>
  )
}

export default DoneView
