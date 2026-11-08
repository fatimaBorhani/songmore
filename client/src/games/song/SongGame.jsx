import { useEffect, useRef, useState } from 'react'
import {
  getGame,
  getPracticeGame,
  getTodayLeaderboard,
  nextPracticeGame,
  sendGuess,
  sendPracticeGuess,
  sendPracticeSkip,
  sendSkip,
} from './api.js'
import { STAGES } from './stages.js'
import { faNumber, faSeconds } from '../../shared/format.js'
import WavePlayer from './components/WavePlayer.jsx'
import SearchBox from './components/SearchBox.jsx'
import GuessHistory from './components/GuessHistory.jsx'
import GameOver from './components/GameOver.jsx'
import ModeSwitch from './components/ModeSwitch.jsx'
import AnimatedNumber from '../../shared/components/AnimatedNumber.jsx'
import Leaderboard from '../../shared/components/Leaderboard.jsx'
import { playWinSound } from './audioPlayer.js'
import { SITE_NAME } from '../../shared/site.js'
import './song.css'

// صفحه‌ی بازی حدس آهنگ: مسابقه‌ای (آدرس /song) و تمرینی (آدرس /song/practice)
// user: کاربر واردشده یا null (از App میاد، چون ورود بین همه‌ی بازی‌ها مشترکه)
// mode: 'daily' (مسابقه‌ای، روزی یه آهنگ و امتیاز) یا 'practice' (تمرینی، نامحدود و بدون امتیاز)
function SongGame({ user, mode = 'daily' }) {
  const practice = mode === 'practice'
  const [game, setGame] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [testMode, setTestMode] = useState(false)
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
    ;(practice ? getPracticeGame : getGame)()
      .then((data) => {
        setGame(data)
        setTestMode(Boolean(data.testMode))
      })
      .catch(() => setError('سرور در دسترس نیست. اول سرور رو روشن کن.'))
  }

  // هر حالت (مسابقه‌ای/تمرینی) یه نمونه‌ی جداست (key توی App)، پس mode توی یه نمونه عوض نمی‌شه
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadGame, [])

  useEffect(() => {
    document.title = `${practice ? 'حدس آهنگ (تمرینی)' : 'حدس آهنگ'} · ${SITE_NAME}`
  }, [practice])

  // اگه صفحه بسته شد، تایمر جشن نمونه
  useEffect(() => () => clearTimeout(celebrateTimer.current), [])

  // بعد از ورود یا خروج، بازی امروز رو دوباره بگیر:
  // با ورود بازی حساب میاد (که بازی مهمان این مرورگر هم بهش منتقل شده)، با خروج بازی مهمان
  const userId = user ? user.id : null
  const lastUserId = useRef(userId)
  useEffect(() => {
    if (lastUserId.current === userId) return // اولین بار یا بدون تغییر
    lastUserId.current = userId
    loadGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function handleGuess(song) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const label = `${song.title} - ${song.credit}`
      const updated = await (practice ? sendPracticeGuess : sendGuess)(song.id, label)
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
      const updated = await (practice ? sendPracticeSkip : sendSkip)()
      setGame(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // تمرینی: بعد از تموم شدن بازی، آهنگ تصادفی بعدی
  async function handleNextPractice() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      stopCelebration()
      setGame(await nextPracticeGame())
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // فقط توی حالت تست: دکمه‌ای که بدون رفرش، یه آهنگ جدید میاره (فقط مسابقه‌ای)
  const nextSongButton = testMode && !practice && (
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
  const skipCost = game.finished || practice ? 0 : game.worthNow - game.worthAfterSkip

  return (
    <main className="game-page">
      <ModeSwitch mode={mode} />

      <header className="game-header">
        <h1>بازی حدس آهنگ</h1>
        <p className="guesses-left">
          {game.finished ? 'بازی تموم شد' : `${faNumber(game.guessesLeft)} حدس و ${faNumber(game.skipsLeft)} رد کردن باقی مونده`}
        </p>
      </header>

      <GuessHistory guesses={game.guesses} celebrating={celebrating} />

      {!game.finished && !practice && (
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
            {/* رد کردن از حدس‌ها جداست؛ توی مرحله‌ی آخر دیگه جایی برای رد کردن نیست */}
            {game.skipsLeft > 0 && (
              <button type="button" className="skip-button" disabled={busy} onClick={handleSkip}>
                {skipLabel}
                {skipCost > 0 && <span className="skip-cost"> −{faNumber(skipCost)}</span>}
              </button>
            )}
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
            practice={practice}
            onNext={practice ? handleNextPractice : testMode ? loadGame : undefined}
          />
          {!practice && (
            <Leaderboard
              user={user}
              load={getTodayLeaderboard}
              refreshKey={`${user ? user.id : 'guest'}-${game.date}-${game.score}`}
            />
          )}
        </>
      )}
    </main>
  )
}

export default SongGame
