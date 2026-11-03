import { useEffect, useState } from 'react'
import { clipUrl, getGame, sendGuess, sendSkip } from './api.js'
import { playClip } from './audioPlayer.js'
import { getStats, recordResult } from './stats.js'
import StageIndicator from './components/StageIndicator.jsx'
import SearchBox from './components/SearchBox.jsx'
import GuessHistory from './components/GuessHistory.jsx'
import GameOver from './components/GameOver.jsx'
import StatsPanel from './components/StatsPanel.jsx'
import './App.css'

function App() {
  const [game, setGame] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeStage, setActiveStage] = useState(null)
  const [stats, setStats] = useState(getStats)
  const [testMode, setTestMode] = useState(false)

  function loadGame() {
    setError('')
    getGame()
      .then((data) => {
        setGame(data)
        setTestMode(Boolean(data.testMode))
        setActiveStage(null)
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

  async function handlePlay(clip) {
    setActiveStage(clip.stage)
    try {
      await playClip(clipUrl(clip.file))
    } catch {
      setError('پخش صدا با مشکل مواجه شد.')
    }
  }

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
    <button type="button" className="skip-button" disabled={busy} onClick={loadGame}>
      🔀 آهنگ بعدی
    </button>
  )

  if (error && !game) {
    return (
      <main className="game-page">
        <p className="error">{error}</p>
        <button type="button" className="skip-button" onClick={loadGame}>
          تلاش دوباره
        </button>
      </main>
    )
  }

  if (!game) {
    return (
      <main className="game-page">
        <p>در حال بارگذاری...</p>
      </main>
    )
  }

  return (
    <main className="game-page">
      <h1>بازی حدس آهنگ</h1>

      <StageIndicator clips={game.clips} activeStage={activeStage} onPlay={handlePlay} />

      {!game.finished && (
        <>
          <SearchBox disabled={busy} onChoose={handleGuess} />
          <button type="button" className="skip-button" disabled={busy} onClick={handleSkip}>
            رد کردن (مرحله‌ی بعد)
          </button>
          {nextSongButton}
          <p className="guesses-left">{game.guessesLeft} حدس باقی مونده</p>
        </>
      )}

      {error && <p className="error">{error}</p>}

      <GuessHistory guesses={game.guesses} />

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
