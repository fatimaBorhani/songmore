// سرور سایت بازی‌ها: چیزهای مشترک (کوکی، ورود، بازیکن) + API هر بازی زیر مسیر خودش
//   /api/auth/...  ورود و ثبت‌نام (مشترک بین همه‌ی بازی‌ها)
//   /api/song/...  بازی حدس آهنگ
//   /api/word/...  بازی واژه‌یاب
//   /api/color/... بازی حافظه‌ی رنگ
//   /clips/...     فایل‌های کلیپ بازی آهنگ
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getOrCreateSessionId } from './core/session.js'
import { authRouter } from './core/authRoutes.js'
import { attachPlayer } from './core/player.js'
import { songRouter, RANDOM_SONG_MODE } from './games/song/routes.js'
import { wordRouter } from './games/word/routes.js'
import { colorRouter } from './games/color/routes.js'

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
app.use('/api/song', songRouter)
app.use('/api/word', wordRouter)
app.use('/api/color', colorRouter)
app.use('/clips', express.static(CLIPS_DIR))

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`سرور روی پورت ${PORT} روشن شد`)
    if (RANDOM_SONG_MODE) console.log('حالت تست: هر رفرش = آهنگ جدید و بازی واژه‌یاب از اول')
  })
}

export { app }
