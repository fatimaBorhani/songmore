import { useEffect, useRef, useState } from 'react'
import { getClueGame, resetClueTest, sendClueGiveUp, sendClueGuess, sendClueHint } from './api.js'
import { shareText, sortGuesses } from './clue.js'
import GuessRow from './components/GuessRow.jsx'
import ClueMenu from './components/ClueMenu.jsx'
import ClueResult from './components/ClueResult.jsx'
import ClueHelp from './components/ClueHelp.jsx'
import HelpButton from '../../shared/components/HelpButton.jsx'
import { useGameHelp } from '../../shared/useGameHelp.js'
import { faNumber } from '../../shared/format.js'
import { SITE_NAME } from '../../shared/site.js'
import './clue.css'

const GAME_TITLE = 'جوربندی'

const ERROR_MESSAGES = {
  NOT_IN_LIST: 'این کلمه رو نمی‌شناسیم',
  ALREADY_GUESSED: 'اینو قبلاً حدس زدی',
  INVALID_WORD: 'یه کلمه بنویس',
  NO_HINTS: 'دیگه راهنمایی نمونده؛ خیلی نزدیکی!',
  GAME_OVER: 'بازی امروز تموم شده',
}

// صفحه‌ی بازی «جوربندی» (آدرس /clue)
// user: کاربر واردشده یا null (از App میاد؛ با عوض شدنش بازی دوباره گرفته می‌شه)
function ClueGame({ user }) {
  const [game, setGame] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('') // خطا یا پیام کوتاه زیر جای نوشتن
  // راهنما: مهمان هر بار، کاربر واردشده فقط بار اول (useGameHelp)
  const { helpOpen, openHelp, closeHelp } = useGameHelp('clue', user)
  const input = useRef(null)

  function loadGame() {
    getClueGame()
      .then((g) => {
        setLoadError('')
        setGame(g)
      })
      .catch((e) =>
        setLoadError(
          e.message === 'NO_DATA'
            ? 'داده‌ی این بازی هنوز ساخته نشده (python tools/build_clue_ranks.py).'
            : 'سرور در دسترس نیست. اول سرور رو روشن کن.'
        )
      )
  }

  useEffect(() => {
    document.title = `${GAME_TITLE} · ${SITE_NAME}`
  }, [])

  // اول بار، و بعد از ورود یا خروج، بازی امروز رو (دوباره) بگیر
  const userId = user ? user.id : null
  useEffect(loadGame, [userId])

  // یه کار روی سرور (حدس، راهنما، تسلیم): وضعیت تازه رو می‌گیره یا پیام خطا نشون می‌ده
  async function run(action) {
    if (busy) return false
    setBusy(true)
    setMessage('')
    try {
      setGame(await action())
      return true
    } catch (e) {
      setMessage(ERROR_MESSAGES[e.message] ?? 'یه مشکلی پیش اومد، دوباره امتحان کن')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    const word = text.trim()
    if (!word) return
    if (await run(() => sendClueGuess(word))) setText('')
    input.current?.focus()
  }

  async function handleShare() {
    const share = shareText(game, GAME_TITLE)
    try {
      await navigator.clipboard.writeText(share)
      setMessage('نتیجه کپی شد')
    } catch {
      setMessage('کپی نشد')
    }
  }

  if (loadError && !game) {
    return (
      <main className="clue-page">
        <p className="error">{loadError}</p>
        <button type="button" className="ghost-button" onClick={loadGame}>
          تلاش دوباره
        </button>
      </main>
    )
  }

  if (!game) {
    return (
      <main className="clue-page">
        <p className="loading">در حال بارگذاری...</p>
      </main>
    )
  }

  // آخرین کار بازیکن (حدس یا راهنما) جدا بالای لیست میاد
  const latest = game.guesses.length ? game.guesses[game.guesses.length - 1] : null
  const sorted = sortGuesses(game.guesses)

  return (
    <main className="clue-page">
      <div className="clue-title-row">
        <h1>{GAME_TITLE}</h1>
        <span className="clue-help-slot">
          <HelpButton onClick={openHelp} />
        </span>
      </div>

      {helpOpen && <ClueHelp onClose={closeHelp} />}

      {game.finished ? (
        <ClueResult game={game} onShare={handleShare} />
      ) : (
        <form className="clue-form" onSubmit={submit}>
          <label className="clue-input">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <span className="clue-sr-only">حدس تو</span>
            <input
              ref={input}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setMessage('')
              }}
              placeholder="یه کلمه بنویس"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              enterKeyHint="send"
              maxLength={40}
              readOnly={busy}
              autoFocus
            />
            <span className="clue-count">#{faNumber(game.guesses.length + 1)}</span>
          </label>
          <ClueMenu busy={busy} onHint={() => run(sendClueHint)} onGiveUp={() => run(sendClueGiveUp)} />
        </form>
      )}

      <p className="clue-message" role="status">
        {message}
      </p>

      {latest && !game.finished && (
        <>
          <GuessRow guess={latest} latest />
          <hr className="clue-divider" />
        </>
      )}

      {sorted.length > 0 && (
        <ol className="clue-list" aria-label="حدس‌ها، نزدیک‌ترین اول">
          {sorted.map((g) => (
            <li key={g.number}>
              <GuessRow guess={g} latest={!game.finished && g.number === latest?.number} />
            </li>
          ))}
        </ol>
      )}

      {game.testMode && (
        <button type="button" className="ghost-button clue-test-reset" disabled={busy} onClick={() => run(resetClueTest)}>
          بازی دوباره با کلمه‌ی جدید (تست)
        </button>
      )}
    </main>
  )
}

export default ClueGame
