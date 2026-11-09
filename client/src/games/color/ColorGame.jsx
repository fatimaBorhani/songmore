import { useEffect, useRef, useState } from 'react'
import { getColorGame, sendColorGuess, startColorRound } from './api.js'
import { INITIAL_HSB, shareText } from './color.js'
import Dots from './components/Dots.jsx'
import MemorizeCard from './components/MemorizeCard.jsx'
import ReadyCard from './components/ReadyCard.jsx'
import RecreateView from './components/RecreateView.jsx'
import ResultView from './components/ResultView.jsx'
import SummaryView from './components/SummaryView.jsx'
import { SITE_NAME } from '../../shared/site.js'
import './color.css'

const GAME_TITLE = 'حافظه‌ی رنگ' // اسم موقت

const ERROR_TEXT = {
  GAME_OVER: 'بازی امروز تموم شده.',
  INVALID_COLOR: 'این رنگ درست نیست؛ دوباره امتحان کن.',
}

// صفحه‌ی بازی حافظه‌ی رنگ (آدرس /color)
// هر دور: «آماده» -> حفظ کردن (چند ثانیه رنگ رو می‌بینی) -> ساختن از حافظه با اسلایدرها -> نتیجه.
// بعد از ۵ دور، خلاصه‌ی بازی. user: کاربر واردشده یا null (از App میاد)
function ColorGame({ user }) {
  const [game, setGame] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | ready | memorize | recreate | result | summary
  const [target, setTarget] = useState(null) // رنگ دور جاری؛ فقط موقع حفظ کردن توی حافظه‌ست
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [hsb, setHsb] = useState(INITIAL_HSB)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const timer = useRef(null)
  const noticeTimer = useRef(null)

  function stopTimer() {
    clearInterval(timer.current)
    timer.current = null
  }

  // اگه صفحه بسته شد، تایمرها نمونن
  useEffect(
    () => () => {
      clearInterval(timer.current)
      clearTimeout(noticeTimer.current)
    },
    []
  )

  function notify(text) {
    setNotice(text)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 1800)
  }

  function loadGame() {
    setError('')
    stopTimer()
    setTarget(null)
    getColorGame()
      .then((data) => {
        setGame(data)
        setPhase(data.finished ? 'summary' : 'ready')
      })
      .catch(() => setError('سرور در دسترس نیست. اول سرور رو روشن کن.'))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadGame, [])

  useEffect(() => {
    document.title = `${GAME_TITLE} · ${SITE_NAME}`
  }, [])

  // بعد از ورود یا خروج، بازی امروز رو دوباره بگیر (بازی مهمان با ورود به حساب منتقل می‌شه)
  const userId = user ? user.id : null
  const lastUserId = useRef(userId)
  useEffect(() => {
    if (lastUserId.current === userId) return
    lastUserId.current = userId
    loadGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // شروع دور: رنگ رو از سرور می‌گیریم و شمارش معکوس شروع می‌شه؛ آخرش رنگ ناپدید می‌شه
  async function startRound() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const { color } = await startColorRound()
      const total = game.memorizeSeconds
      const end = Date.now() + total * 1000
      setTarget(color)
      setHsb(INITIAL_HSB)
      setSecondsLeft(total)
      setPhase('memorize')
      stopTimer()
      timer.current = setInterval(() => {
        const left = Math.max(0, (end - Date.now()) / 1000)
        setSecondsLeft(left)
        if (left <= 0) {
          stopTimer()
          setTarget(null)
          setPhase('recreate')
        }
      }, 100)
    } catch (e) {
      setError(ERROR_TEXT[e.message] || e.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitGuess() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const updated = await sendColorGuess(hsb)
      setGame(updated)
      setPhase('result')
    } catch (e) {
      setError(ERROR_TEXT[e.message] || e.message)
      if (e.message === 'GAME_OVER') loadGame()
    } finally {
      setBusy(false)
    }
  }

  function nextRound() {
    setError('')
    setPhase(game.finished ? 'summary' : 'ready')
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(shareText(game, GAME_TITLE))
      notify('نتیجه کپی شد')
    } catch {
      notify('کپی نشد')
    }
  }

  if (error && !game) {
    return (
      <main className="color-page color-center">
        <p className="error">{error}</p>
        <button type="button" className="color-btn ghost" onClick={loadGame}>
          تلاش دوباره
        </button>
      </main>
    )
  }

  if (!game) {
    return (
      <main className="color-page color-center">
        <p className="loading">در حال بارگذاری...</p>
      </main>
    )
  }

  const result = game.rounds.at(-1)
  // دور جاری برای نقطه‌ها: وقتی نتیجه یا خلاصه نشون می‌دیم دور جاری نداریم
  const current = phase === 'result' || phase === 'summary' ? -1 : game.completed

  return (
    <main className="color-page">
      <header className="color-head">
        <h1>{GAME_TITLE}</h1>
        <Dots total={game.roundCount} completed={game.completed} current={current} />
      </header>

      {phase === 'ready' && (
        <ReadyCard
          round={game.completed + 1}
          roundCount={game.roundCount}
          seconds={game.memorizeSeconds}
          busy={busy}
          onStart={startRound}
        />
      )}
      {phase === 'memorize' && target && (
        <MemorizeCard color={target} hsb={hsb} secondsLeft={secondsLeft} totalSeconds={game.memorizeSeconds} />
      )}
      {phase === 'recreate' && <RecreateView hsb={hsb} onChange={setHsb} onSubmit={submitGuess} busy={busy} />}
      {phase === 'result' && result && (
        <ResultView result={result} game={game} last={game.finished} busy={busy} onNext={nextRound} />
      )}
      {phase === 'summary' && <SummaryView game={game} onShare={share} testMode={game.testMode} onReplay={loadGame} />}

      {error && <p className="error">{error}</p>}
      {notice && (
        <p className="color-toast" role="status">
          {notice}
        </p>
      )}
    </main>
  )
}

export default ColorGame
