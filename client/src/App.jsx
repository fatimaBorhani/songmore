import { useEffect, useRef, useState } from 'react'
import { fetchMyStats, getGame, getMe, sendGuess, sendSkip } from './api.js'
import { getStats, recordResult } from './stats.js'
import { STAGES, faNumber, faSeconds } from './stages.js'
import WavePlayer from './components/WavePlayer.jsx'
import SearchBox from './components/SearchBox.jsx'
import GuessHistory from './components/GuessHistory.jsx'
import GameOver from './components/GameOver.jsx'
import AnimatedNumber from './components/AnimatedNumber.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import StatsPanel from './components/StatsPanel.jsx'
import { playWinSound } from './audioPlayer.js'
import AuthPanel from './components/AuthPanel.jsx'
import './App.css'

function App() {
  const [game, setGame] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState(getStats) // آمار مهمان (توی همین مرورگر)
  const [myStats, setMyStats] = useState(null) // آمار کاربر واردشده (از سرور)
  const [testMode, setTestMode] = useState(false)
  const [user, setUser] = useState(null) // کاربر واردشده، یا null
  const [celebrating, setCelebrating] = useState(false) // جشن حدس درست در حال نمایشه؟
  const celebrateTimer = useRef(null)

  // جشن حدس درست: موج می‌رقصه، ردیف درست نبض می‌زنه و صدای پیروزی پخش می‌شه.
  // فقط همون لحظه‌ی حدس درست، نه با باز کردن یا رفرش صفحه.
  function celebrate() {
    clearTimeout(celebrateTimer.current)
    setCelebrating(true)
    playWinSound()
    celebrateTimer.current = setTimeout(() => setCelebrating(false), 3000)
  }

  function stopCelebration() {
    clearTimeout(celebrateTimer.current)
    setCelebrating(false)
  }

  function loadGame() {
    setError('')
    stopCelebration()
    getGame()
      .then((data) => {
        setGame(data)
        setTestMode(Boolean(data.testMode))
      })
      .catch(() => setError('سرور در دسترس نیست. اول سرور رو روشن کن.'))
  }

  useEffect(loadGame, [])

  // اگه صفحه بسته شد، تایمر جشن نمونه
  useEffect(() => () => clearTimeout(celebrateTimer.current), [])

  // اول کار ببین کاربر قبلاً وارد شده یا نه (کوکی ورود)
  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {}) // اگه سرور در دسترس نبود، loadGame خودش خطا رو نشون می‌ده
  }, [])

  // وقتی بازی تموم می‌شه آمار رو آپدیت کن:
  // کاربر واردشده -> از سرور بگیر؛ مهمان -> توی مرورگر ثبت کن (فقط یه بار برای هر روز)
  useEffect(() => {
    if (!game?.finished) return
    if (user) {
      fetchMyStats()
        .then(setMyStats)
        .catch(() => {})
      return
    }
    const won = game.guesses.some((g) => g.result === 'correct')
    setStats(recordResult(game.date, won, game.score))
  }, [game, user])

  // بعد از ورود یا خروج، بازی امروز رو دوباره بگیر:
  // با ورود بازی حساب میاد (که بازی مهمان این مرورگر هم بهش منتقل شده)، با خروج بازی مهمان
  function handleUserChange(newUser) {
    setUser(newUser)
    setMyStats(null)
    loadGame()
  }

  async function handleGuess(song) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const updated = await sendGuess(song.id, `${song.title} - ${song.credit}`)
      setGame(updated)
      if (updated.guesses.at(-1)?.result === 'correct') celebrate()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSkip() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const updated = await sendSkip()
      setGame(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // فقط توی حالت تست: دکمه‌ای که بدون رفرش، یه آهنگ جدید میاره
  const nextSongButton = testMode && (
    <button type="button" className="ghost-button" disabled={busy} onClick={loadGame}>
      آهنگ بعدی (تست)
    </button>
  )

  if (error && !game) {
    return (
      <main className="game-page">
        <p className="error">{error}</p>
        <button type="button" className="ghost-button" onClick={loadGame}>
          تلاش دوباره
        </button>
      </main>
    )
  }

  if (!game) {
    return (
      <main className="game-page">
        <p className="loading">در حال بارگذاری...</p>
      </main>
    )
  }

  // رد کردن چند ثانیه به کلیپ اضافه می‌کنه؟ (برای نوشتن روی دکمه)
  const unlocked = game.clips.length
  const lastClip = game.clips[unlocked - 1]
  const extraSeconds = unlocked < STAGES.length ? STAGES[unlocked] - STAGES[unlocked - 1] : 0
  const skipLabel = extraSeconds ? `رد کردن +${faSeconds(extraSeconds)} ث` : 'رد کردن'
  // رد کردن چند امتیاز از «ارزش الان» کم می‌کنه
  const skipCost = game.finished ? 0 : game.worthNow - game.worthAfterSkip

  return (
    <main className="game-page">
      <AuthPanel user={user} onUserChange={handleUserChange} />

      <header className="game-header">
        <h1>بازی حدس آهنگ</h1>
        <p className="guesses-left">
          {game.finished ? 'بازی تموم شد' : `${faNumber(game.guessesLeft)} فرصت باقی مونده`}
        </p>
      </header>

      <GuessHistory guesses={game.guesses} celebrating={celebrating} />

      {!game.finished && (
        <div className="worth" aria-live="polite">
          <span className="worth-label">ارزش الان</span>
          <span className="worth-value">
            <AnimatedNumber value={game.worthNow} />
          </span>
        </div>
      )}

      <WavePlayer
        key={`${unlocked}-${lastClip.file}`}
        clips={game.clips}
        celebrating={celebrating}
        onError={() => setError('پخش صدا با مشکل مواجه شد.')}
      />

      {!game.finished && (
        <>
          <div className="guess-row">
            <SearchBox disabled={busy} onChoose={handleGuess} />
            <button type="button" className="skip-button" disabled={busy} onClick={handleSkip}>
              {skipLabel}
              {skipCost > 0 && <span className="skip-cost"> −{faNumber(skipCost)}</span>}
            </button>
          </div>
          {nextSongButton}
        </>
      )}

      {error && <p className="error">{error}</p>}

      {game.finished && (
        <>
          <GameOver
            answer={game.answer}
            guesses={game.guesses}
            score={game.score}
            celebrating={celebrating}
            busy={busy}
            onNext={testMode ? loadGame : undefined}
          />
          {(user ? myStats : stats) && <StatsPanel stats={user ? myStats : stats} />}
          <Leaderboard user={user} refreshKey={`${user ? user.id : 'guest'}-${game.date}-${game.score}`} />
        </>
      )}
    </main>
  )
}

export default App
