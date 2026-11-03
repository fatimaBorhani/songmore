import { useEffect, useState } from 'react'
import { getGame, sendGuess, sendSkip } from './api.js'
import { getStats, recordResult } from './stats.js'
import { STAGES, faNumber, faSeconds } from './stages.js'
import WavePlayer from './components/WavePlayer.jsx'
import SearchBox from './components/SearchBox.jsx'
import GuessHistory from './components/GuessHistory.jsx'
import GameOver from './components/GameOver.jsx'
import StatsPanel from './components/StatsPanel.jsx'
import './App.css'

function App() {
  const [game, setGame] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState(getStats)
  const [testMode, setTestMode] = useState(false)

  function loadGame() {
    setError('')
    getGame()
      .then((data) => {
        setGame(data)
        setTestMode(Boolean(data.testMode))
      })
      .catch(() => setError('سرور در دسترس نیست. اول سرور رو روشن کن.'))
  }

  useEffect(loadGame, [])

  // فقط یه بار برای هر روز، وقتی بازی تموم می‌شه، آمار رو آپدیت کن
  useEffect(() => {
    if (!game?.finished) return
    const won = game.guesses.some((g) => g.result === 'correct')
    setStats(recordResult(game.date, won))
  }, [game])

  async function handleGuess(song) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const updated = await sendGuess(song.id, `${song.title} - ${song.credit}`)
      setGame(updated)
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

  return (
    <main className="game-page">
      <header className="game-header">
        <h1>بازی حدس آهنگ</h1>
        <p className="guesses-left">
          {game.finished ? 'بازی تموم شد' : `${faNumber(game.guessesLeft)} فرصت باقی مونده`}
        </p>
      </header>

      <GuessHistory guesses={game.guesses} />

      <WavePlayer
        key={`${unlocked}-${lastClip.file}`}
        clips={game.clips}
        onError={() => setError('پخش صدا با مشکل مواجه شد.')}
      />

      {!game.finished && (
        <>
          <div className="guess-row">
            <SearchBox disabled={busy} onChoose={handleGuess} />
            <button type="button" className="skip-button" disabled={busy} onClick={handleSkip}>
              {skipLabel}
            </button>
          </div>
          {nextSongButton}
        </>
      )}

      {error && <p className="error">{error}</p>}

      {game.finished && (
        <>
          <GameOver answer={game.answer} guesses={game.guesses} />
          {nextSongButton}
          <StatsPanel stats={stats} />
        </>
      )}
    </main>
  )
}

export default App
