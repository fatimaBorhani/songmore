// پنجره‌ی «یه سؤال پیشنهاد بده» (صفحه‌ی آخر امروز)؛ با Esc، کلیک بیرون یا «بی‌خیال» بسته می‌شه
import { useEffect, useState } from 'react'
import { sendSuggestion } from '../api.js'

const SUGGEST_ERRORS = {
  INVALID_SUGGESTION: 'سؤال باید بین ۱۰ تا ۲۰۰ حرف باشه.',
  TOO_MANY_SUGGESTIONS: 'امروز به اندازه‌ی کافی پیشنهاد دادی! فردا باز بیا.',
}

function SuggestDialog({ onClose }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent
  const [error, setError] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim() || status === 'sending') return
    setStatus('sending')
    setError('')
    try {
      await sendSuggestion(text)
      setStatus('sent')
    } catch (err) {
      setError(SUGGEST_ERRORS[err.message] || 'نشد بفرستیم. یه بار دیگه امتحان کن.')
      setStatus('idle')
    }
  }

  return (
    <div className="help-backdrop" onClick={onClose}>
      <div className="help-dialog survey-suggest" role="dialog" aria-modal="true" aria-labelledby="survey-suggest-title" onClick={(e) => e.stopPropagation()}>
        {status === 'sent' ? (
          <>
            <h2 id="survey-suggest-title">مرسی، رسید!</h2>
            <p>شاید یه روز همین سؤال رو صد نفر جواب بدن!</p>
            <button type="button" className="help-ok" onClick={onClose} autoFocus>
              باشه
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="survey-suggest-title">یه سؤال پیشنهاد بده</h2>
            <label className="survey-sr-only" htmlFor="survey-suggest-text">
              سؤال پیشنهادی
            </label>
            <textarea
              id="survey-suggest-text"
              rows={3}
              maxLength={200}
              value={text}
              placeholder="مثلاً: یه چیزی که توی کوله‌ی کوهنوردی می‌ذارن"
              autoFocus
              onChange={(e) => setText(e.target.value)}
            />
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <div className="help-nav">
              <button type="button" className="help-prev" onClick={onClose}>
                بی‌خیال
              </button>
              <button type="submit" className="help-ok" disabled={!text.trim() || status === 'sending'}>
                {status === 'sending' ? 'یه لحظه...' : 'بفرست'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default SuggestDialog
