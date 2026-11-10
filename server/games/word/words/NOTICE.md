# لیست کلمه‌های واژه‌یاب

این فایل‌ها با `tools/build_word_lists.py` ساخته شدن (دستی ویرایششون نکن؛ کلمه‌ی ناخواسته رو توی `tools/word_exclude.txt` بنویس و اسکریپت رو دوباره اجرا کن).

- `valid_N.txt`: حدس‌های مجاز (همه‌ی کلمه‌های N حرفیِ لیلک)
- `answers_N.txt`: جواب‌های ممکن (اسم یا صفتِ آشنا، دست‌چین‌شده)

## منبع‌ها

- **Lilak**: لغت‌نامه‌ی غلط‌یاب فارسی، Copyright 2015 Mostafa Sedaghat Joo، لایسنس Apache License 2.0
  (http://www.apache.org/licenses/LICENSE-2.0) — https://github.com/b00f/lilak
  کلمه‌ها از فایل `src/data/lexicon` گرفته و نرمال شدن (حذف نیم‌فاصله، اعراب و یکسان‌سازی ی/ک) و بر اساس طول جدا شدن.
- **mainwords**: تعداد تکرار کلمه‌ها توی ۱۷۱ وبلاگ فارسی، لایسنس CC0 1.0 — https://github.com/ehsan957/mainwords
  فقط برای تشخیص اینکه کدوم کلمه‌ها آشنان استفاده شده.
