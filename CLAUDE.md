# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# پروژه: بازی حدس آهنگ فارسی (شبیه Songless)

## هدف
هر روز یه آهنگ. کاربر کلیپ‌های کوتاه (از ۰.۱۵ ثانیه تا ۱۵ ثانیه) می‌شنوه و حداکثر ۵ بار حدس می‌زنه.

## استک
- فرانت: React + Vite (JavaScript، نه TypeScript)، راست‌به‌چپ، فونت Vazirmatn از npm (@fontsource/vazirmatn)
- بک‌اند: Node.js (نسخه‌ی ۲۰ به بالا) + Express + SQLite با پکیج better-sqlite3 (بدون ORM)؛ تست با node --test؛ هر دو بخش JavaScript با ESM (import/export)
- صدا: Web Audio API
- ابزار داده: Python 3 + ffmpeg
- هیچ فایل/فونت/آیکن از CDN خارجی نگیر (ممکنه فیلتر باشه)؛ همه‌چیز self-hosted

## ساختار پوشه‌ها
client/  فرانت
server/  بک‌اند
tools/   اسکریپت‌های پایتون
data/    songs.json و artists.json (خروجی اسکریپت‌های خودم؛ فقط بخون، دستی ویرایش نکن)
data/audio/  آهنگ‌های اصلی (توی git نمیره)
clips/   کلیپ‌های ساخته‌شده (توی git نمیره)

## قوانین بازی
- مراحل کلیپ: [0.15, 0.5, 2, 8, 15] ثانیه؛ هر مرحله از اول کلیپ پخش می‌شه
- ۵ حدس. «رد کردن» یه حدس حساب می‌شه و مرحله‌ی بعد رو باز می‌کنه
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
- یه تست تنها: `cd server && node --test test/guessLogic.test.js` (یا با `--test-name-pattern="..."`)
- پر کردن دیتابیس: `node server/seed.js` (از songs.json + artists.json + clip_map.json؛ فقط آهنگ‌هایی که توی clip_map کلیپ دارن وارد بازی می‌شن)
- ساخت کلیپ: `python3 tools/make_clips.py` (به ffmpeg نیاز داره؛ فقط آهنگ‌های جدید رو به clip_map.json اضافه می‌کنه)
- خوندن ژانر و سال از تگ mp3ها: `python3 tools/read_song_tags.py` (با ffprobe؛ فقط می‌خونه و خروجی‌ش `tools/song_tags.csv` برای بررسی دستیه)
- ژانر و دهه‌ی آهنگ‌ها: `python3 tools/build_song_categories.py` (ژانر از روی خواننده از `tools/artist_genres.csv`، سال از `tools/song_tags.csv` مگر اینکه توی `tools/year_overrides.csv` دستی درست شده باشه؛ خروجی `tools/song_categories.csv` برای بررسی دستی)
- کلاینت (پوشه‌ی `client/`): `npm run dev` (پورت 5173 روی 127.0.0.1)، `npm run build`، `npm run lint` (oxlint)
- متغیرهای محیطی سرور: `PORT`، `CLIPS_DIR`، `DB_PATH` (پیش‌فرض `server/game.db`؛ تست‌ها `:memory:` می‌ذارن)

## معماری
- `server/index.js` اپ Express رو می‌سازه و `app` رو export می‌کنه (تست `game.test.js` اونو روی یه سرور http واقعی بالا میاره). APIها: `/api/health`، `/api/game`، `/api/search`، `/api/guess`، `/api/skip`؛ و `/clips` فایل‌های استاتیک `CLIPS_DIR` رو سرو می‌کنه
- `db.js` جدول‌ها رو با SQL خام می‌سازه (artists، songs، daily_song، guesses و ...)
- `dailySong.js`: تاریخ روز به وقت Asia/Tehran؛ آهنگ هر تاریخ یه بار انتخاب (آهنگی که کمتر تکرار شده) و توی `daily_song` ذخیره می‌شه
- `session.js`: شناسه‌ی بازیکن توی کوکی `songmore_session`؛ حدس‌ها با (session_id, date) توی جدول guesses ذخیره می‌شن
- `guesses.js` مراحل (`STAGES`) و ساخت وضعیت بازی برای کلاینت رو داره — اینجاست که باید مطمئن بود جواب قبل از پایان بازی لو نمی‌ره. `guessLogic.js` نتیجه‌ی حدس (correct/present/incorrect) رو حساب می‌کنه؛ `normalize.js` و `search.js` جستجو رو انجام می‌دن
- کلاینت: `src/api.js` آدرس سرور رو از `window.location.hostname:3001` می‌سازه (نه localhost ثابت) تا کوکی نشست بین هاست‌ها گم نشه؛ همه‌ی درخواست‌ها با `credentials: 'include'`. `audioPlayer.js` پخش کلیپ‌ها با Web Audio، `stats.js` آمار بازیکن
