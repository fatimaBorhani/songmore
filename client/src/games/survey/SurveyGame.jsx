import { useEffect, useRef, useState } from 'react'
import { getSurveyState, requestMore, resetSurveyTest, sendAnswer, sendSkip } from './api.js'
import QuestionView from './components/QuestionView.jsx'
import DoneView from './components/DoneView.jsx'
import { SITE_NAME } from '../../shared/site.js'
import './survey.css'

const TITLE = 'صد نفر گفتن' // اسم موقت

const ERROR_MESSAGES = {
  INVALID_ANSWER: 'جواب باید حداقل یه حرف داشته باشه.',
  ANSWER_TOO_LONG: 'جواب خیلی بلنده. کوتاه‌ترش کن.',
  NOT_CURRENT: 'این سؤال دیگه جاری نیست؛ صفحه به‌روز شد.',
  NO_PENDING: 'سؤال‌های الان تموم شدن.',
  PENDING_QUESTIONS: 'اول به سؤال‌های الان جواب بده.',
  NO_MORE_QUESTIONS: 'سؤال دیگه‌ای نمونده. ممنون که این‌قدر جواب دادی!',
}

// صفحه‌ی نظرسنجی «صد نفر گفتن» (آدرس /survey)
// هر روز چند سؤال کوتاه؛ جواب‌ها برای ساختن بازی‌های بعدی جمع می‌شن. هیچ جواب یا درصدی نشون داده نمی‌شه.
// user: کاربر واردشده یا null (از App میاد)
function SurveyGame({ user }) {
  const [state, setState] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sending = useRef(false) // جلوی دو بار ثبت پشت سر هم رو می‌گیره

  // وضعیت رو از سرور می‌گیره (state فقط بعد از جواب سرور عوض می‌شه)
  function load() {
    getSurveyState()
      .then((fresh) => {
        setLoadError('')
        setState(fresh)
      })
      .catch(() => setLoadError('سرور در دسترس نیست. اول سرور رو روشن کن.'))
  }

  useEffect(load, [])

  useEffect(() => {
    document.title = `${TITLE} · ${SITE_NAME}`
  }, [])

  // بعد از ورود یا خروج، وضعیت دوباره گرفته می‌شه (جواب‌های مهمان به حساب منتقل شدن)
  const userId = user ? user.id : null
  const lastUserId = useRef(userId)
  useEffect(() => {
    if (lastUserId.current === userId) return
    lastUserId.current = userId
    load()
  }, [userId])

  // یه کار (ثبت، رد کردن، ...) رو انجام می‌ده و وضعیت تازه رو می‌ذاره؛ خطا رو به فارسی نشون می‌ده
  async function run(action) {
    if (sending.current) return
    sending.current = true
    setBusy(true)
    setError('')
    try {
      setState(await action())
    } catch (e) {
      setError(ERROR_MESSAGES[e.message] || e.message)
      if (e.message === 'NOT_CURRENT' || e.message === 'NO_PENDING') load()
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  if (loadError && !state) {
    return (
      <main className="survey-page">
        <p className="error">{loadError}</p>
        <button type="button" className="ghost-button" onClick={load}>
          تلاش دوباره
        </button>
      </main>
    )
  }

  if (!state) {
    return (
      <main className="survey-page">
        <p className="loading">در حال بارگذاری...</p>
      </main>
    )
  }

  if (state.finished) {
    return <DoneView title={TITLE} state={state} busy={busy} error={error} onMore={() => run(requestMore)} onReset={() => run(resetSurveyTest)} />
  }

  // key: با عوض شدن سؤال، جعبه‌ی جواب خالی و دوباره فوکوس می‌شه
  return (
    <QuestionView
      key={state.current.id}
      title={TITLE}
      state={state}
      busy={busy}
      error={error}
      onSubmit={(answer) => run(() => sendAnswer(state.current.id, answer))}
      onSkip={() => run(() => sendSkip(state.current.id))}
    />
  )
}

export default SurveyGame
