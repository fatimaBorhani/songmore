#!/usr/bin/env python3
"""ساخت لیست کلمه‌های بازی واژه‌یاب (۳، ۴ و ۵ حرفی).

دو منبع (هر دو آزاد) لازمه:
  1) لیلک (Lilak، لایسنس Apache 2.0): فهرست کلمه‌های فارسی با نوع کلمه
       git clone --depth 1 https://github.com/b00f/lilak tools/wordlists/lilak
  2) mainwords (CC0): تعداد تکرار کلمه‌ها توی ۱۷۱ وبلاگ فارسی
       git clone --depth 1 https://github.com/ehsan957/mainwords tools/wordlists/mainwords

اجرا:  python3 tools/build_word_lists.py
خروجی (توی server/games/word/words/):
  valid_N.txt    همه‌ی کلمه‌های N حرفیِ لیلک (حدس‌های مجاز)
  answers_N.txt  جواب‌های ممکن: اسم یا صفتی که حداقل MIN_BLOG بار توی وبلاگ‌ها اومده،
                 بدون کلمه‌هایی که توی tools/word_exclude.txt نوشتی
فقط می‌خونه و کلمه‌ها رو خودکار فیلتر می‌کنه؛ کلمه‌ی بدی دیدی، توی word_exclude.txt بنویس و دوباره اجرا کن.
"""
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LILAK = ROOT / "tools/wordlists/lilak/src/data/lexicon"
BLOGS = ROOT / "tools/wordlists/mainwords/Farsi/repeated_words.sql"
EXCLUDE = ROOT / "tools/word_exclude.txt"
OUT = ROOT / "server/games/word/words"

LENGTHS = (3, 4, 5)
MIN_BLOG = 20  # حداقل تعداد تکرار توی وبلاگ‌ها برای اینکه کلمه «آشنا» حساب بشه
# نوع‌هایی که برای جواب قبولن (فعل، ضمیر، قید و ... نه)
ANSWER_TYPES = {"noun_singular", "noun_plural", "adjective"}

# ۳۴ حرف بازی (باید با server/games/word/letters.js یکی باشه)
LETTERS = set("اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئ")
VARIANTS = {"ي": "ی", "ى": "ی", "ك": "ک", "ة": "ه", "ۀ": "ه", "أ": "ا", "إ": "ا", "ؤ": "و"}
IGNORED = re.compile("[\\s‌‍ـً-ٰٟ]")


def normalize(word: str) -> str:
    word = "".join(VARIANTS.get(ch, ch) for ch in word)
    return IGNORED.sub("", word)


def read_lilak():
    """{کلمه: مجموعه‌ی نوع‌هاش}"""
    words = {}
    for line in LILAK.read_text(encoding="utf8").splitlines():
        if line.startswith("#") or not line.strip():
            continue
        parts = line.strip().split(",")
        words.setdefault(normalize(parts[0]), set()).add(parts[1] if len(parts) > 1 else "")
    return words


def read_blog_counts():
    text = BLOGS.read_text(encoding="utf8")
    counts = Counter()
    for word, count, _ in re.findall(r"\('((?:[^'\\]|\\.|'')*)',\s*(\d+),\s*(\d+)\)", text):
        counts[normalize(word.replace("''", "'"))] += int(count)
    return counts


def read_exclude():
    if not EXCLUDE.exists():
        return set()
    words = set()
    for line in EXCLUDE.read_text(encoding="utf8").splitlines():
        for word in line.split("#")[0].split():
            words.add(normalize(word))
    return words


def main():
    for path in (LILAK, BLOGS):
        if not path.exists():
            sys.exit(f"فایل پیدا نشد: {path}\nاول توضیح بالای همین اسکریپت رو انجام بده.")
    lilak = read_lilak()
    blogs = read_blog_counts()
    exclude = read_exclude()
    OUT.mkdir(parents=True, exist_ok=True)

    for n in LENGTHS:
        valid = sorted(w for w in lilak if len(w) == n and set(w) <= LETTERS)
        answers = sorted(
            (
                w
                for w in valid
                if lilak[w] <= ANSWER_TYPES and blogs[w] >= MIN_BLOG and w not in exclude
            ),
            key=lambda w: (-blogs[w], w),
        )
        (OUT / f"valid_{n}.txt").write_text("\n".join(valid) + "\n", encoding="utf8")
        (OUT / f"answers_{n}.txt").write_text("\n".join(sorted(answers)) + "\n", encoding="utf8")
        print(f"{n} حرفی: {len(valid)} حدس مجاز، {len(answers)} جواب")


if __name__ == "__main__":
    main()
