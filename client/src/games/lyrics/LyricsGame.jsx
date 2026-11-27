import { useEffect, useState } from 'react'
import { clipAddress, getLyricsGame, resetLyricsTest, sendLyricsAnswer } from './api.js'
import { currentLineIndex, shareText } from './lyrics.js'
import { useLyricsPlayer } from './useLyricsPlayer.js'
import SongCard from './components/SongCard.jsx'
import LyricsList from './components/LyricsList.jsx'
import AnswerForm from './components/AnswerForm.jsx'
import SongEnd from './components/SongEnd.jsx'
import DaySummary from './components/DaySummary.jsx'
import LyricsHelp from './components/LyricsHelp.jsx'
import HelpButton from '../../shared/components/HelpButton.jsx'
import { useGameHelp } from '../../shared/useGameHelp.js'
import { copyText } from '../../shared/copy.js'
import { faNumber } from '../../shared/format.js'
import { SITE_NAME } from '../../shared/site.js'
import './lyrics.css'

const GAME_TITLE = 'جورشعر'

const ERROR_MESSAGES = {
  EMPTY_ANSWER: 'حداقل یه خط بنویس',
  ANSWER_TOO_LONG: 'یه کم کوتاه‌تر بنویس',
  NOT_CURRENT: 'این آهنگ دیگه جاری نیست؛ صفحه رو دوباره باز کن',
  GAME_OVER: 'بازی امروز تموم شده',
}

// صفحه‌ی بازی «جورشعر» (آدرس /lyrics)
// مرحله‌ها (phase) برای هر آهنگ:
//   ready      گرامافون و دکمه‌ی «پخش کن»
//   playing    کلیپ اول پخش می‌شه و متن هم‌زمان جلو می‌ره
//   question   آهنگ ایستاده؛ بازیکن دو خط بعدی رو می‌نویسه
//   continuing بعد از ثبت جواب، بقیه‌ی آهنگ پخش می‌شه
//   done       کارت امتیاز همین آهنگ و «آهنگ بعدی»
//   summary    خلاصه‌ی روز (بعد از هر سه آهنگ)
function LyricsGame({ user }) {
  const [game, setGame] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [viewSlot, setViewSlot] = useState(1) // آهنگی که الان روی صفحه‌ست
  const [phase, setPhase] = useState('ready')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const player = useLyricsPlayer()
  const { helpOpen, openHelp, closeHelp } = useGameHelp('lyrics', user)

  function applyFresh(g) {
    setGame(g)
    setLoadError('')
    if (g.dayFinished) {
      setPhase('summary')
    } else {
      setViewSlot(g.slot)
      setPhase('ready')
    }
    player.stop()
    player.setNow(0)
  }

  function loadGame() {
    getLyricsGame()
      .then(applyFresh)
      .catch((e) =>
        setLoadError(
          e.message === 'NO_DATA'
            ? 'داده‌ی این بازی هنوز ساخته نشده (python tools/build_lyrics_game.py).'
            : 'سرور در دسترس نیست. اول سرور رو روشن کن.'
        )
      )
  }

  useEffect(() => {
    document.title = `${GAME_TITLE} · ${SITE_NAME}`
  }, [])

  const userId = user ? user.id : null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadGame, [userId])

  if (loadError && !game) {
    return (
      <main className="lyrics-page">
        <p className="error">{loadError}</p>
        <button type="button" className="ghost-button" onClick={loadGame}>
          تلاش دوباره
        </button>
      </main>
    )
  }
  if (!game) {
    return (
      <main className="lyrics-page">
        <p className="loading">در حال بارگذاری...</p>
      </main>
    )
  }

  const slot = game.slots.find((s) => s.slot === viewSlot) ?? game.slots[0]

  // پخش از یه نقطه‌ی خط زمانی (اول کلیپ، یا هر خطی که بازیکن بزنه)
  // قبل از سؤال: کلیپ اول؛ اگه جواب داده شده، بعدش کلیپ دوم هم پشتش پخش می‌شه
  function playFrom(ms) {
    if (!slot) return
    const q = slot.questionAtMs
    const playAfter = (offset) =>
      player.play(clipAddress(slot.clipAfter), offset, q, () => {
        if (phase === 'continuing') setPhase('done')
      })
    if (ms >= q && slot.finished) {
      playAfter(ms - q)
      return
    }
    player.play(clipAddress(slot.clipBefore), Math.min(ms, q), 0, () => {
      if (slot.finished) playAfter(0)
      else setPhase('question')
    })
  }

  function startSong() {
    setMessage('')
    setPhase('playing')
    playFrom(0)
  }

  async function submit(line1, line2) {
    setBusy(true)
    setMessage('')
    try {
      const g = await sendLyricsAnswer(slot.slot, line1, line2)
      setGame(g)
      const answered = g.slots.find((s) => s.slot === slot.slot)
      setPhase('continuing')
      // بقیه‌ی آهنگ از جای سؤال پخش می‌شه
      player.play(clipAddress(answered.clipAfter), 0, answered.questionAtMs, () => setPhase('done'))
    } catch (e) {
      setMessage(ERROR_MESSAGES[e.message] || 'یه مشکلی پیش اومد؛ دوباره امتحان کن')
    } finally {
      setBusy(false)
    }
  }

  function next() {
    player.stop()
    player.setNow(0)
    setMessage('')
    if (game.dayFinished) {
      setPhase('summary')
    } else {
      setViewSlot(game.slot)
      setPhase('ready')
    }
  }

  async function share() {
    setMessage((await copyText(shareText(game, GAME_TITLE))) ? 'نتیجه کپی شد' : 'کپی نشد')
  }

  async function testReset() {
    try {
      applyFresh(await resetLyricsTest())
    } catch {
      setMessage('ریست نشد')
    }
  }

  // نقطه‌های بالای صفحه: آهنگ‌های تموم‌شده یشمی، آهنگ جاری رنگ اصلی
  const dots = game.slots.map((s) => (s.finished && (s.slot !== viewSlot || phase === 'done' || phase === 'summary') ? 'done' : s.slot === viewSlot && phase !== 'summary' ? 'on' : ''))
  const finishedCount = game.slots.filter((s) => s.finished).length

  const inSong = phase !== 'ready' && phase !== 'summary'
  const current = player.playing ? currentLineIndex(slot.lines, player.now) : -1
  const showAgain = !player.playing && (phase === 'question' || phase === 'done')
  const backText = player.playing ? 'برگرد به خط جاری' : phase === 'question' ? 'برگرد به نوبت خودت' : 'برگرد به جواب‌ها'

  return (
    <main className={`lyrics-page phase-${phase}`}>
      <header className="lyrics-top">
        <h1 className="game-title">{GAME_TITLE}</h1>
        <div className="lyrics-tools">
          <div className="lyrics-dots" role="img" aria-label={`${faNumber(finishedCount)} از ${faNumber(game.songCount)} آهنگ تموم شده`}>
            {dots.map((d, i) => (
              <span key={i} className={d} />
            ))}
          </div>
          <HelpButton onClick={openHelp} />
        </div>
      </header>

      {phase === 'summary' && <DaySummary game={game} message={message} onShare={share} />}

      {phase === 'ready' && slot && (
        <section className="lyrics-ready" aria-label="آهنگ بعدی">
          <span className="lyrics-record big" aria-hidden="true">
            <i />
          </span>
          <div className="lyrics-ready-name">
            <h2>{slot.title}</h2>
            <span>{slot.artist}</span>
          </div>
          <div className="lyrics-ready-blanks" aria-hidden="true">
            <span />
            <span className="short" />
          </div>
          <button type="button" className="lyrics-play" onClick={startSong}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
            </svg>
            پخش کن
          </button>
        </section>
      )}

      {inSong && slot && (
        <div className="lyrics-body">
          <SongCard slot={slot} now={player.now} playing={player.playing} showAgain={showAgain} onAgain={() => playFrom(0)} />
          <LyricsList
            slot={slot}
            current={current}
            followKey={`${phase}:${current}:${player.playing}`}
            blanks={phase === 'playing'}
            onLine={playFrom}
            backText={backText}
          >
            {phase === 'question' && <AnswerForm key={slot.slot} busy={busy} onSubmit={submit} />}
          </LyricsList>
          {message && phase === 'question' && (
            <p className="lyrics-message" role="alert">
              {message}
            </p>
          )}
          {phase === 'done' && <SongEnd points={slot.points} last={game.dayFinished} onNext={next} />}
        </div>
      )}

      {game.testMode && (phase === 'ready' || phase === 'summary') && (
        <button type="button" className="ghost-button lyrics-test" onClick={testReset}>
          بازی دوباره با تیکه‌های جدید (تست)
        </button>
      )}

      {helpOpen && <LyricsHelp onClose={closeHelp} />}
    </main>
  )
}

export default LyricsGame
