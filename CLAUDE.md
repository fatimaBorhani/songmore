# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# پروژه: سایت بازی‌های روزانه‌ی فارسی

## هدف
یه سایت با چند بازی روزانه؛ صفحه‌ی اول بازی رو انتخاب می‌کنی. بازی اول «حدس آهنگ» (شبیه Songless): هر روز یه آهنگ، کلیپ‌های کوتاه (از ۰.۱۵ تا ۱۵ ثانیه) و حداکثر ۵ حدس. بازی بعدی (برنامه‌ریزی‌شده): وردل فارسی با اسم موقت «واژه‌یاب» (اسم Wordle و ظاهر نیویورک‌تایمز رو کپی نکن).

## استک
- فرانت: React + Vite + react-router (JavaScript، نه TypeScript)، راست‌به‌چپ، فونت Vazirmatn از npm (@fontsource/vazirmatn)
- بک‌اند: Node.js (نسخه‌ی ۲۰ به بالا) + Express + SQLite با پکیج better-sqlite3 (بدون ORM)؛ تست با node --test؛ هر دو بخش JavaScript با ESM (import/export)
- صدا: Web Audio API
- ابزار داده: Python 3 + ffmpeg
- هیچ فایل/فونت/آیکن از CDN خارجی نگیر (ممکنه فیلتر باشه)؛ همه‌چیز self-hosted

## ساختار پوشه‌ها
client/src/
  App.jsx           پوسته‌ی سایت: سربرگ مشترک (اسم سایت + ورود) و مسیرها (react-router)
  pages/            صفحه‌ی اول (انتخاب بازی) و «پیدا نشد»
  games/index.js    فهرست بازی‌ها (کارت‌های صفحه‌ی اول از روی همینه)
  games/song/       همه‌چیزِ بازی حدس آهنگ (SongGame.jsx، api.js، اجزا، song.css)
  shared/           مشترک بین بازی‌ها: api.js (درخواست + ورود)، format.js، site.js (اسم سایت)، اجزای ورود/آمار/جدول امتیاز، shared.css
server/
  index.js          اپ Express: میان‌افزارهای مشترک + وصل کردن API هر بازی زیر مسیر خودش
  core/             مشترک: db.js، session.js، auth.js، authRoutes.js، player.js، normalize.js
  games/song/       بازی حدس آهنگ: routes.js، scoring.js، guesses.js، guessLogic.js، dailySong.js، search.js، playerStats.js، leaderboard.js، seed.js
  test/core/ و test/song/   تست‌ها، هم‌شکل همون پوشه‌ها
tools/   اسکریپت‌های پایتون
data/    songs.json و artists.json (خروجی اسکریپت‌های خودم؛ فقط بخون، دستی ویرایش نکن)
data/audio/  آهنگ‌های اصلی (توی git نمیره)
clips/   کلیپ‌های ساخته‌شده (توی git نمیره)

برای اضافه کردن بازی جدید: `client/src/games/<بازی>/` + یه خط توی `games/index.js` + یه `Route` توی `App.jsx`؛ سمت سرور `server/games/<بازی>/routes.js` و `app.use('/api/<بازی>', ...)` توی `index.js`. ورود، بازیکن و اجزای مشترک رو دوباره ننویس.

## قوانین بازی
- مراحل کلیپ: [0.15, 0.5, 2, 8, 15] ثانیه؛ هر مرحله از اول کلیپ پخش می‌شه
- ۵ حدس. «رد کردن» یه حدس حساب می‌شه و مرحله‌ی بعد رو باز می‌کنه
- حدس غلط (incorrect یا present) فقط یه حدس کم می‌کنه و مرحله‌ی بعد رو باز نمی‌کنه؛ فقط «رد کردن» زمان کلیپ رو زیاد می‌کنه
- امتیاز (`server/scoring.js`): ارزش مرحله‌ای که توش درست حدس زده (۱۰٬۰۰۰ / ۷٬۵۶۴ / ۵٬۳۰۵ / ۳٬۷۹۷ / ۳٬۵۰۰، منحنی Songless) منهای ۱٬۰۰۰ برای هر حدس غلط و ۵۰۰ برای هر «خواننده درسته»؛ رد کردن جریمه‌ی جدا نداره چون خودش مرحله رو جلو می‌بره؛ برد حداقل ۱٬۰۰۰، باخت ۰. همه‌ی حساب‌ها روی سروره؛ کشیدن روی موج اثری نداره
- نتیجه‌ی هر حدس: correct (🟩)، present (🟨: آهنگ غلطه ولی یکی از خواننده‌هاش با جواب یکیه)، incorrect (🟥)، skipped (⬜)، حدس نزده (⬛)
- آهنگ روز نیمه‌شب به وقت تهران عوض می‌شه
- جواب فقط آخر بازی (برد یا حدس پنجم) به کلاینت میرسه. هیچ API نباید قبلش جواب رو لو بده (نه عنوان، نه اسم فایل اصلی). اسم فایل کلیپ‌ها شناسه‌ی تصادفی است

## جستجو
- وقتی کاربر اسم یه خواننده رو بنویسه، همه‌ی آهنگ‌های اون خواننده (اصلی + همکاری/feat) بیاد؛ اول آهنگ‌هایی که اصلی‌ان
- جستجو با اسم فارسی، انگلیسی، aliases و عنوان آهنگ کار کنه
- نرمال‌سازی فارسی: ي→ی، ك→ک، نیم‌فاصله و اعراب حذف، حروف انگلیسی کوچیک

## قواعد کار با من
- من تازه‌کارم: کد ساده، کامنت فارسی کوتاه، توضیحات به فارسی ساده
- قبل هر تغییر بزرگ (حذف فایل، تغییر ساختار، کتابخونه‌ی جدید) از من بپرس
- هر مرحله رو خودت تست کن و بگو چه دستوری بزنم تا خودم ببینم
- هر مرحله یه commit با پیام واضح
- پیام commitها فقط انگلیسی باشه
- هیچ خط Co-Authored-By یا اسم Claude توی پیام commit نباشه

## کار تیمی و داده
- چند نفر روی این ریپو کار می‌کنن؛ فعلاً سرور نداریم و همه‌چیز باید لوکال اجرا و تست بشه
- مسیر پوشه‌ی کلیپ‌ها از متغیر محیطی CLIPS_DIR خونده بشه (پیش‌فرض ./clips)؛ هیچ مسیر ثابتی توی کد ننویس
- data/audio، clips/، *.zip، *.db و .env هرگز توی git نرن
- data/clip_map.json رو هیچ‌وقت پاک یا از نو نساز

## دستورها
- سرور (پوشه‌ی `server/`): `npm run dev` (پورت 3001، `node --watch`)، `npm start`، `npm test` (همه‌ی تست‌ها با `node --test`)
- یه تست تنها: `cd server && node --test test/song/guessLogic.test.js` (یا با `--test-name-pattern="..."`)
- پر کردن دیتابیس بازی آهنگ: `cd server && npm run seed` (از songs.json + artists.json + clip_map.json؛ فقط آهنگ‌هایی که توی clip_map کلیپ دارن وارد بازی می‌شن)
- ساخت کلیپ: `python3 tools/make_clips.py` (به ffmpeg نیاز داره؛ فقط آهنگ‌های جدید رو به clip_map.json اضافه می‌کنه)
- خوندن ژانر و سال از تگ mp3ها: `python3 tools/read_song_tags.py` (با ffprobe؛ فقط می‌خونه و خروجی‌ش `tools/song_tags.csv` برای بررسی دستیه)
- ژانر و دهه‌ی آهنگ‌ها: `python3 tools/build_song_categories.py` (ژانر از روی خواننده از `tools/artist_genres.csv`، سال از `tools/song_tags.csv` مگر اینکه توی `tools/year_overrides.csv` دستی درست شده باشه؛ خروجی `tools/song_categories.csv` برای بررسی دستی)
- کلاینت (پوشه‌ی `client/`): `npm run dev` (پورت 5173 روی 127.0.0.1؛ صفحه‌ی اول `/`، بازی آهنگ `/song`)، `npm run build`، `npm run lint` (oxlint)
- متغیرهای محیطی سرور: `PORT`، `CLIPS_DIR`، `DB_PATH` (پیش‌فرض `server/game.db`؛ تست‌ها `:memory:` می‌ذارن)

## معماری
- `server/index.js` اپ Express رو می‌سازه و `app` رو export می‌کنه (تست‌ها اونو روی یه سرور http واقعی بالا میارن). مسیرها: `/api/health`، `/api/auth/...` (مشترک)، `/api/song/...` (بازی آهنگ)، و `/clips` فایل‌های استاتیک `CLIPS_DIR`
- **مشترک (`server/core/`)**
  - `db.js` جدول‌ها رو با SQL خام می‌سازه (artists، songs، daily_song، guesses، users، auth_sessions و ...)؛ پیش‌فرض دیتابیس `server/game.db`؛ ستون‌های جدید رو برای دیتابیس‌های قدیمی خودکار اضافه می‌کنه
  - `session.js`: شناسه‌ی مرورگر توی کوکی `songmore_session`
  - `player.js`: «بازیکن» = اگه وارد شده `user:<id>`، وگرنه شناسه‌ی مرورگر (`req.playerKey`). موقع ثبت‌نام/ورود، بازی‌های مهمانِ همون مرورگر به حساب منتقل می‌شن (`claimGuestGames`)، مگر روزهایی که حساب خودش بازی داره
  - احراز هویت (`auth.js` و `authRoutes.js`): نام کاربری و رمز؛ رمز با `crypto.scrypt` خود Node هش می‌شه. APIها: `POST /api/auth/signup`، `POST /api/auth/login`، `POST /api/auth/logout`، `GET /api/auth/me`. نشست ورود توی کوکی جدای `songmore_auth` (فقط هش توکن توی جدول `auth_sessions`). بعد از ۱۰ تلاش ناموفق ورود از یه IP، تا ۱۵ دقیقه 429 برمی‌گرده (توی حافظه، با ری‌استارت سرور صفر می‌شه)
- **بازی آهنگ (`server/games/song/`)**، APIها زیر `/api/song`: `game`، `search`، `guess`، `skip`، `stats`، `leaderboard/today`
  - `dailySong.js`: تاریخ روز به وقت Asia/Tehran؛ آهنگ هر تاریخ یه بار انتخاب (آهنگی که کمتر تکرار شده) و توی `daily_song` ذخیره می‌شه
  - حدس‌ها با (playerKey, date) توی ستون `session_id` جدول guesses ذخیره می‌شن
  - `scoring.js`: مراحل (`STAGES`)، فرمول امتیاز، `computeScore` (امتیاز بازی تموم‌شده) و `getWorth` (ارزش الان و ارزش بعد از رد کردن). `GET /api/song/game` وسط بازی `worthNow`/`worthAfterSkip` و آخر بازی `score` برمی‌گردونه
  - `guesses.js` ساخت وضعیت بازی برای کلاینت رو داره — اینجاست که باید مطمئن بود جواب قبل از پایان بازی لو نمی‌ره. `guessLogic.js` نتیجه‌ی حدس (correct/present/incorrect) رو حساب می‌کنه؛ `search.js` (با `core/normalize.js`) جستجو رو انجام می‌ده
  - `playerStats.js` و `GET /api/song/stats`: آمار کاربر واردشده از روی حدس‌ها (روی همه‌ی دستگاه‌ها یکیه)؛ مهمان‌ها آمار رو توی localStorage دارن (`client/src/games/song/stats.js`)
  - `leaderboard.js` و `GET /api/song/leaderboard/today`: جدول امتیاز امروز (فقط کاربرهای واردشده‌ای که تموم کردن؛ مساوی‌ها با زمان تموم کردن از ستون `created_at` جدول guesses)
  - حالت تست (`npm run dev` = `--random-song`): هر بار باز کردن بازی، آهنگ تصادفی جدید و پاک شدن بازی امروز همون بازیکن
- **کلاینت**
  - `App.jsx`: سربرگ مشترک و مسیرها؛ کاربر واردشده رو یه بار می‌گیره و به صفحه‌ی هر بازی می‌ده (`user`). صفحه‌ی بازی با عوض شدن کاربر بازی رو دوباره می‌گیره
  - `shared/api.js` آدرس سرور رو از `window.location.hostname:3001` می‌سازه (نه localhost ثابت) تا کوکی نشست بین هاست‌ها گم نشه؛ همه‌ی درخواست‌ها با `credentials: 'include'`. API هر بازی توی `games/<بازی>/api.js`
  - بازی آهنگ: `audioPlayer.js` پخش کلیپ‌ها با Web Audio (از هر نقطه تا آخر مرحله)، `WavePlayer.jsx` کارت موج که از مرحله‌ی دوم با کشیدن موس/انگشت یا کلیدهای جهت جای پخش رو عوض می‌کنه (موقع کشیدن صدا نیست، با ول کردن پخش می‌شه)
  - روی سرور واقعی، هاست باید همه‌ی آدرس‌های ناشناخته رو به `index.html` برگردونه (برای react-router)؛ سرور dev خود Vite این کار رو می‌کنه
