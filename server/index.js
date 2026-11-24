// سرور سایت بازی‌ها: چیزهای مشترک (کوکی، ورود، بازیکن) + API هر بازی زیر مسیر خودش
//   /api/auth/...  ورود و ثبت‌نام (مشترک بین همه‌ی بازی‌ها)
//   /api/song/...  جورزیک
//   /api/word/...  بازی جورچین
//   /api/color/... بازی جورنگ
//   /api/clue/...  بازی «جوربندی»
//   /api/weekly    جدول هفته (امتیاز یکسان همه‌ی بازی‌ها)
//   /api/survey/.. نظرسنجی «صد جور» (جمع کردن داده برای بازی‌های بعدی)
//   /clips/...     فایل‌های کلیپ بازی آهنگ
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getOrCreateSessionId } from './core/session.js'
import { authRouter } from './core/authRoutes.js'
import { helpRouter } from './core/helpRoutes.js'
import { attachPlayer } from './core/player.js'
import { songRouter, RANDOM_SONG_MODE } from './games/song/routes.js'
import { wordRouter } from './games/word/routes.js'
import { colorRouter } from './games/color/routes.js'
import { surveyRouter } from './games/survey/routes.js'
import { clueRouter } from './games/clue/routes.js'
import { weeklyRouter } from './games/weekly/routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const app = express()
const PORT = process.env.PORT || 3001
const CLIPS_DIR = process.env.CLIPS_DIR || path.join(ROOT, 'clips')

app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204) // پیش‌درخواست CORS
  next()
})
app.use((req, res, next) => {
  req.sessionId = getOrCreateSessionId(req, res)
  next()
})
// req.user و req.playerKey: اگه وارد شده بازی‌ها مال حسابشه، وگرنه مال همین مرورگر
app.use(attachPlayer)

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/help', helpRouter)
app.use('/api/song', songRouter)
app.use('/api/word', wordRouter)
app.use('/api/color', colorRouter)
app.use('/api/survey', surveyRouter)
app.use('/api/clue', clueRouter)
app.use('/api/weekly', weeklyRouter)
app.use('/clips', express.static(CLIPS_DIR))

// آدرس API که وجود نداره: جواب JSON (نه صفحه‌ی HTML پیش‌فرض Express)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' })
})

// خطاها: همیشه JSON، بدون لو دادن جزئیات داخلی (مثل مسیر فایل‌ها) به کلاینت
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // بدنه‌ی درخواست JSON درست نبود یا خیلی بزرگ بود
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'INVALID_JSON' })
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'TOO_LARGE' })
  if (process.env.NODE_ENV !== 'test') console.error(err)
  res.status(500).json({ error: 'SERVER_ERROR' })
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`سرور روی پورت ${PORT} روشن شد`)
    if (RANDOM_SONG_MODE) console.log('حالت تست: بازی جورچین و رنگ با هر رفرش از اول شروع می‌شن؛ بازی آهنگ فقط با دکمه‌ی «بازی دوباره (تست)»')
  })
}

export { app }
