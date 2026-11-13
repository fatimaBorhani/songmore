import { useEffect, useRef, useState } from 'react'
import { getWordGame, resetWordTest, sendWordGiveUp, sendWordGuess, sendWordSuggestion } from './api.js'
import { isUnknownCharacterKey, letterFromKeyEvent, letterStatuses, shareText } from './letters.js'
import { REVEAL_TOTAL_MS } from './timing.js'
import Board from './components/Board.jsx'
import Keyboard from './components/Keyboard.jsx'
import WordResult from './components/WordResult.jsx'
import HelpDialog from './components/HelpDialog.jsx'
import ContinueDialog from './components/ContinueDialog.jsx'
import { faNumber } from '../../shared/format.js'
import { SITE_NAME } from '../../shared/site.js'
import './word.css'

const GAME_TITLE = 'واژه‌یاب' // اسم موقت
const HELP_SEEN_KEY = 'songmore_word_help_seen'

const ERROR_MESSAGES = {
  INVALID_LETTERS: 'فقط حروف فارسی',
  NOT_IN_LIST: 'این کلمه توی فرهنگ لغت نیست',
  GAME_OVER: 'بازی امروز تموم شده',
}

const SUGGEST_ERRORS = {
  TOO_MANY_SUGGESTIONS: 'امروز به اندازه‌ی کافی کلمه پیشنهاد دادی. فردا دوباره امتحان کن',
  ALREADY_IN_LIST: 'این کلمه الان توی لیست هست',
  NOT_A_WORD: 'این کلمه معنی‌دار به نظر نمیاد',
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
  const [continueChosen, setContinueChosen] = useState(false) // بعد از ۶ حدس گفته «ادامه می‌دم»
  const [suggest, setSuggest] = useState(null) // کلمه‌ی ردشده برای «فکر می‌کنم درسته»: { word, status: idle | sending | sent }
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
    setSuggest(null)
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
    setContinueChosen(false)
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

  // بعد از حدس ششمِ غلط (وقتی ردیف آخر برگشت) باید انتخاب کنه: ادامه یا جواب. اگه رفرش کرده و بیشتر از ۶ حدس داره،
  // یعنی قبلاً ادامه رو انتخاب کرده و دیگه نمی‌پرسیم
  const showContinueDialog = !!game && game.exhausted && revealRow < 0 && !continueChosen && game.guesses.length === game.maxGuesses

  // وقتی بازی تموم شده، ردیف داره برمی‌گرده یا پنجره‌ی «ادامه می‌دی؟» بازه، تایپ قفله
  const locked = !game || game.finished || busy || revealRow >= 0 || showContinueDialog

  function addLetter(letter) {
    if (locked) return
    setSuggest(null)
    setTyped((t) => (t.length >= game.wordLength ? t : [...t, letter]))
  }

  function removeLetter() {
    if (locked) return
    setSuggest(null)
    setTyped((t) => t.slice(0, -1))
  }

  async function submit() {
    if (locked || sending.current) return
    if (typed.length < game.wordLength) {
      showToast('حروف کافی نیست')
      shakeRow()
      return
    }
    sending.current = true
    setBusy(true)
    setSuggest(null)
    const attempt = typed.join('')
    try {
      const updated = await sendWordGuess(attempt)
      const row = updated.guesses.length - 1
      setGame(updated)
      setTyped([])
      setRevealRow(row)
      // اول کاشی‌ها یکی‌یکی برمی‌گردن، بعد (اگه برد بود) ردیف می‌پره
      later(() => {
        setRevealRow(-1)
        if (updated.solved) {
          setWinRow(row)
          later(() => setWinRow(-1), 1100)
        }
      }, REVEAL_TOTAL_MS)
    } catch (e) {
      if (e.message === 'NOT_IN_LIST') {
        // به‌جای پیام معمولی، یه نوار با دکمه‌ی «فکر می‌کنم درسته» (تا حرف بعدی می‌مونه)
        setSuggest({ word: attempt, status: 'idle' })
      } else {
        showToast(e.message === 'WORD_LENGTH' ? `کلمه باید ${faNumber(game.wordLength)} حرف باشه` : ERROR_MESSAGES[e.message] || e.message)
      }
      shakeRow()
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  // «فکر می‌کنم درسته»: کلمه‌ی ردشده برای بررسی ثبت می‌شه
  async function suggestRejectedWord() {
    if (!suggest || suggest.status !== 'idle') return
    const { word } = suggest
    setSuggest({ word, status: 'sending' })
    try {
      await sendWordSuggestion(word)
      setSuggest({ word, status: 'sent' })
      later(() => setSuggest((s) => (s && s.status === 'sent' ? null : s)), 2200)
    } catch (e) {
      showToast(SUGGEST_ERRORS[e.message] || e.message)
    }
  }

  // «جواب رو ببینم» (بعد از ۶ حدس غلط): کلمه باخت حساب می‌شه و کارت نتیجه با جواب میاد
  async function giveUp() {
    if (busy) return
    setBusy(true)
    try {
      setGame(await sendWordGiveUp())
      setTyped([])
    } catch (e) {
      showToast(ERROR_MESSAGES[e.message] || e.message)
    } finally {
      setBusy(false)
    }
  }

  // فقط حالت تست: ۳ کلمه‌ی تصادفی جدید و شروع دوباره‌ی بازی امروز
  async function resetTest() {
    if (busy) return
    setBusy(true)
    try {
      const fresh = await resetWordTest()
      setTyped([])
      setRevealRow(-1)
      setWinRow(-1)
      setContinueChosen(false)
      setGame(fresh)
    } catch (e) {
      showToast(e.message)
    } finally {
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
      // پنجره‌ی «ادامه می‌دی؟» بازه: کیبورد دکمه‌های همون پنجره رو کار می‌ندازه (Enter)، نه تایپ
      if (showContinueDialog) return
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
  // بعد از ۶ حدس: «حالت ادامه» (نوار بالای صفحه‌ی حرف‌ها) تا پیدا کنه یا «جواب رو ببینم» بزنه
  const continuing = game.exhausted && !showContinueDialog
  const nextSlot = game.slots[game.slot] // کلمه‌ی بعدی (اگه هست)
  // هر حدسِ بعد از ۶ تا یه ردیف بیشتر (تا وقتی پنجره‌ی «ادامه می‌دی؟» بازه هنوز همون ۶ ردیف)
  const rowCount = Math.max(game.maxGuesses, game.guesses.length + (game.finished || showContinueDialog ? 0 : 1))

  return (
    <main className={`word-page ${isDesktop ? 'desktop' : 'touch'}${showResult ? ' finished' : ''}${continuing ? ' continuing' : ''}`}>
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
            {game.dayFinished
              ? 'بازی امروز تموم شد'
              : game.finished
                ? `کلمه‌ی ${faNumber(game.wordLength)} حرفی تموم شد`
                : game.exhausted
                  ? `کلمه‌ی ${faNumber(game.wordLength)} حرفی`
                  : `کلمه‌ی ${faNumber(game.wordLength)} حرفی · حدس ${faNumber(guessNumber)} از ${faNumber(game.maxGuesses)}`}
          </p>
          <div className="word-progress" role="img" aria-label={`کلمه‌ی ${faNumber(game.slot)} از ${faNumber(game.slotCount)}`}>
            {game.slots.map((s) => (
              <span key={s.slot} className={s.finished ? 'done' : s.slot === game.slot ? 'current' : ''} />
            ))}
          </div>
        </div>
        <span className="word-top-spacer" aria-hidden="true" />
      </div>

      {continuing && (
        <div className="word-continue-bar">
          <span className="word-continue-chip">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 12c-1.8-2.4-3.2-4-5-4a4 4 0 0 0 0 8c1.8 0 3.2-1.6 5-4zm0 0c1.8 2.4 3.2 4 5 4a4 4 0 0 0 0-8c-1.8 0-3.2 1.6-5 4z" />
            </svg>
            حالت ادامه · حدس {faNumber(game.guesses.length + 1)} · بدون امتیاز
          </span>
          <button type="button" className="ghost-button" disabled={busy} onClick={giveUp}>
            {nextSlot ? 'کلمه‌ی بعدی' : 'نمایش جواب'}
          </button>
        </div>
      )}

      <div className="word-stage">
        <div className="word-toast-area" role="status">
          {suggest ? (
            <p key="suggest" className="word-toast word-toast-action">
              {suggest.status === 'sent' ? (
                'ممنون! کلمه برای بررسی ثبت شد'
              ) : (
                <>
                  <span>این کلمه توی لیست نیست</span>
                  <button type="button" disabled={suggest.status === 'sending'} onClick={suggestRejectedWord}>
                    فکر می‌کنم درسته
                  </button>
                </>
              )}
            </p>
          ) : (
            toast && (
              <p key={toast.id} className="word-toast">
                {toast.text}
              </p>
            )
          )}
        </div>
        <Board
          guesses={game.guesses}
          typed={typed}
          maxGuesses={game.maxGuesses}
          rowCount={rowCount}
          wordLength={game.wordLength}
          finished={game.finished}
          revealRow={revealRow}
          winRow={winRow}
          shake={shake}
        />
      </div>

      {showResult ? (
        <WordResult game={game} onShare={handleShare} onNext={loadGame} testMode={game.testMode} onReplay={resetTest} />
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

      {game.testMode && !showResult && (
        <button type="button" className="ghost-button word-test-reset" disabled={busy} onClick={resetTest}>
          بازی دوباره (تست)
        </button>
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
      {showContinueDialog && <ContinueDialog busy={busy} onContinue={() => setContinueChosen(true)} onGiveUp={giveUp} />}
    </main>
  )
}

export default WordGame
