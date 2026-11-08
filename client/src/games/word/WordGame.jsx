import { useEffect, useRef, useState } from 'react'
import { getWordGame, sendWordGuess } from './api.js'
import { isUnknownCharacterKey, letterFromKeyEvent, letterStatuses, shareText, WORD_LENGTH } from './letters.js'
import { REVEAL_TOTAL_MS } from './timing.js'
import Board from './components/Board.jsx'
import Keyboard from './components/Keyboard.jsx'
import WordResult from './components/WordResult.jsx'
import HelpDialog from './components/HelpDialog.jsx'
import { faNumber } from '../../shared/format.js'
import { SITE_NAME } from '../../shared/site.js'
import './word.css'

const GAME_TITLE = 'واژه‌یاب' // اسم موقت
const HELP_SEEN_KEY = 'songmore_word_help_seen'

const ERROR_MESSAGES = {
  WORD_LENGTH: 'کلمه باید ۵ حرف باشه',
  INVALID_LETTERS: 'فقط حروف فارسی',
  GAME_OVER: 'بازی امروز تموم شده',
}

// کامپیوتر (موس و کیبورد) یا گوشی و تبلت (لمسی)؟
// کامپیوتر: تایپ فقط با کیبورد خود کامپیوتر و یه نقشه‌ی کوچیک از کیبورد؛ لمسی: دکمه‌های بزرگ
const DESKTOP_QUERY = '(hover: hover) and (pointer: fine)'
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setIsDesktop(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

// راهنما فقط بار اول خودش باز می‌شه
function helpSeenBefore() {
  try {
    return localStorage.getItem(HELP_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

// صفحه‌ی بازی واژه‌یاب (آدرس /word)
// user: کاربر واردشده یا null (از App میاد)
function WordGame({ user }) {
  const [game, setGame] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [typed, setTyped] = useState([]) // حرف‌های ردیف فعلی که هنوز ثبت نشده
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null) // پیام کوتاه بالای صفحه: { text, id }
  const [shake, setShake] = useState(false)
  const [revealRow, setRevealRow] = useState(-1) // ردیفی که کاشی‌هاش دارن برمی‌گردن
  const [winRow, setWinRow] = useState(-1) // ردیف برنده که داره جشن می‌گیره
  const [showHelp, setShowHelp] = useState(() => !helpSeenBefore())
  const isDesktop = useIsDesktop()
  // حالت عیب‌یابی: آدرس /word?debug؛ آخرین کلیدی که به صفحه رسیده و دلیل حرف نشستن یا ننشستنش رو نشون می‌ده
  const debug = new URLSearchParams(window.location.search).has('debug')
  const [keyLog, setKeyLog] = useState([]) // چند کلید آخر (Shift و Win و ... نادیده گرفته می‌شن تا عکس گرفتن جاشون رو نگیره)
  const sending = useRef(false) // جلوی دو بار ثبت با دو Enter پشت سر هم رو می‌گیره
  const timers = useRef([])

  function later(fn, ms) {
    timers.current.push(setTimeout(fn, ms))
  }
  // اگه صفحه بسته شد، تایمرها نمونن
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function showToast(text, ms = 1600) {
    const id = Date.now()
    setToast({ text, id })
    later(() => setToast((t) => (t && t.id === id ? null : t)), ms)
  }

  function shakeRow() {
    setShake(true)
    later(() => setShake(false), 450)
  }

  function loadGame() {
    setLoadError('')
    setTyped([])
    setRevealRow(-1)
    setWinRow(-1)
    getWordGame()
      .then(setGame)
      .catch(() => setLoadError('سرور در دسترس نیست. اول سرور رو روشن کن.'))
  }

  useEffect(loadGame, [])

  useEffect(() => {
    document.title = `${GAME_TITLE} · ${SITE_NAME}`
  }, [])

  // بعد از ورود یا خروج، بازی امروز رو دوباره بگیر (مثل بازی آهنگ)
  const userId = user ? user.id : null
  const lastUserId = useRef(userId)
  useEffect(() => {
    if (lastUserId.current === userId) return
    lastUserId.current = userId
    loadGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // وقتی بازی تموم شده یا ردیف داره برمی‌گرده، تایپ قفله
  const locked = !game || game.finished || busy || revealRow >= 0

  function addLetter(letter) {
    if (locked) return
    setTyped((t) => (t.length >= WORD_LENGTH ? t : [...t, letter]))
  }

  function removeLetter() {
    if (locked) return
    setTyped((t) => t.slice(0, -1))
  }

  async function submit() {
    if (locked || sending.current) return
    if (typed.length < WORD_LENGTH) {
      showToast('حروف کافی نیست')
      shakeRow()
      return
    }
    sending.current = true
    setBusy(true)
    try {
      const updated = await sendWordGuess(typed.join(''))
      const row = updated.guesses.length - 1
      setGame(updated)
      setTyped([])
      setRevealRow(row)
      // اول کاشی‌ها یکی‌یکی برمی‌گردن، بعد (اگه برد بود) ردیف می‌پره
      later(() => {
        setRevealRow(-1)
        if (updated.won) {
          setWinRow(row)
          later(() => setWinRow(-1), 1100)
        }
      }, REVEAL_TOTAL_MS)
    } catch (e) {
      showToast(ERROR_MESSAGES[e.message] || e.message)
      shakeRow()
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  function closeHelp() {
    setShowHelp(false)
    try {
      localStorage.setItem(HELP_SEEN_KEY, '1')
    } catch {
      // اگه مرورگر اجازه نداد مهم نیست؛ فقط دفعه‌ی بعد هم راهنما باز می‌شه
    }
  }

  // تایپ با کیبورد خود کامپیوتر (و کیبوردهای بلوتوثی روی گوشی)
  useEffect(() => {
    function onKeyDown(e) {
      if (debug && !['Meta', 'OS', 'Shift', 'Control', 'Alt', 'AltGraph', 'CapsLock'].includes(e.key)) {
        const entry = {
          key: e.key,
          code: e.code,
          mods: ['ctrl', 'alt', 'shift', 'meta'].filter((m) => e[`${m}Key`]).join('+') || '-',
          target: e.target instanceof Element ? e.target.tagName : '?',
          letter: letterFromKeyEvent(e) ?? '(هیچ)',
          help: showHelp,
          locked,
        }
        setKeyLog((log) => [entry, ...log].slice(0, 5))
      }
      if (showHelp) {
        if (e.key === 'Escape') closeHelp()
        return
      }
      // میانبرهای مرورگر (Ctrl+C، Alt+Tab و ...) کار خودشون رو بکنن. بعضی کیبوردها (AltGr) هم Ctrl و Alt رو
      // با هم میزنن و حرف می‌دن؛ اونا باید کار کنن
      if (e.metaKey || (e.ctrlKey && !e.altKey) || (e.altKey && !e.ctrlKey)) return
      const target = e.target instanceof Element ? e.target : null
      // وقتی داره توی فرم ورود یا هر جعبه‌ی متنی تایپ می‌کنه، کاری نداریم
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      if (e.key === 'Enter') {
        // Enter روی دکمه‌ها و لینک‌های دیگه‌ی صفحه کار خودشون رو بکنن
        if (target?.closest('button, a') && !target.closest('.word-keyboard')) return
        e.preventDefault()
        if (!e.repeat) submit()
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        removeLetter()
        return
      }
      const letter = letterFromKeyEvent(e)
      if (letter) {
        e.preventDefault()
        addLetter(letter)
      } else if (isUnknownCharacterKey(e) && !locked) {
        // کلید حرفی بوده ولی حرف فارسی نیست (مثلاً عدد)؛ بی‌صدا نادیده نمی‌گیریم
        showToast(`«${e.key}» حرف فارسی نیست`)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  async function handleShare() {
    const text = shareText(game, GAME_TITLE)
    // روی گوشی منوی اشتراک خود گوشی؛ روی کامپیوتر کپی
    if (!isDesktop && navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // کاربر بستش یا پشتیبانی نشد؛ می‌ریم سراغ کپی
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      showToast('نتیجه کپی شد')
    } catch {
      showToast('کپی نشد')
    }
  }

  if (loadError && !game) {
    return (
      <main className="word-page">
        <p className="error">{loadError}</p>
        <button type="button" className="ghost-button" onClick={loadGame}>
          تلاش دوباره
        </button>
      </main>
    )
  }

  if (!game) {
    return (
      <main className="word-page">
        <p className="loading">در حال بارگذاری...</p>
      </main>
    )
  }

  // رنگ کیبورد: ردیفی که هنوز داره برمی‌گرده حساب نمی‌شه تا رنگ‌ها زودتر لو نرن
  const settledGuesses = revealRow >= 0 ? game.guesses.slice(0, revealRow) : game.guesses
  const statuses = letterStatuses(settledGuesses)
  const showResult = game.finished && revealRow < 0
  const guessNumber = Math.min(game.guesses.length + 1, game.maxGuesses)

  return (
    <main className={`word-page ${isDesktop ? 'desktop' : 'touch'}${showResult ? ' finished' : ''}`}>
      <div className="word-top">
        <button type="button" className="icon-button" aria-label="آموزش بازی" onClick={() => setShowHelp(true)}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 21h4" />
            <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.2 1.1 2V16h5v-.2c0-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z" />
          </svg>
        </button>
        <div className="word-title">
          <h1>{GAME_TITLE}</h1>
          <p>
            {game.finished
              ? 'بازی امروز تموم شد'
              : `کلمه‌ی ۵ حرفی امروز · حدس ${faNumber(guessNumber)} از ${faNumber(game.maxGuesses)}`}
          </p>
        </div>
        <span className="word-top-spacer" aria-hidden="true" />
      </div>

      <div className="word-stage">
        <div className="word-toast-area" role="status">
          {toast && (
            <p key={toast.id} className="word-toast">
              {toast.text}
            </p>
          )}
        </div>
        <Board
          guesses={game.guesses}
          typed={typed}
          maxGuesses={game.maxGuesses}
          wordLength={game.wordLength}
          finished={game.finished}
          revealRow={revealRow}
          winRow={winRow}
          shake={shake}
        />
      </div>

      {showResult ? (
        <WordResult game={game} onShare={handleShare} testMode={game.testMode} onReplay={loadGame} />
      ) : isDesktop ? (
        <>
          <Keyboard mode="map" statuses={statuses} onLetter={addLetter} onEnter={submit} onDelete={removeLetter} />
          <p className="word-hint">
            با کیبورد تایپ کن (یا روی کلیدها کلیک کن)
            <span aria-hidden="true">·</span>
            <kbd>Enter</kbd> ثبت
            <span aria-hidden="true">·</span>
            <kbd>Backspace</kbd> پاک کردن
          </p>
        </>
      ) : (
        <Keyboard mode="touch" statuses={statuses} onLetter={addLetter} onEnter={submit} onDelete={removeLetter} />
      )}

      {debug && (
        <pre className="word-debug" dir="ltr">
          {keyLog.length
            ? keyLog
                .map((k, i) => `${i === 0 ? '>' : ' '} key=${JSON.stringify(k.key)} code=${k.code} mods=${k.mods} target=${k.target} letter=${k.letter}${i === 0 ? `\n  help open=${k.help} locked=${k.locked}` : ''}`)
                .join('\n')
            : 'یه کلید بزن...'}
        </pre>
      )}

      {showHelp && <HelpDialog onClose={closeHelp} />}
    </main>
  )
}

export default WordGame
