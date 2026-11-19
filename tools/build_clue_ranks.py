#!/usr/bin/env python3
"""ساخت داده‌ی بازی «کلمه‌ی پنهان» (حدس کلمه با نزدیکی معنایی).

برای هر کلمه‌ای که قراره یه روز جواب باشه، از قبل حساب می‌کنه بقیه‌ی کلمه‌ها
از نظر معنی چقدر بهش نزدیکن و TOP تای اول رو به ترتیب ذخیره می‌کنه.
سرور بعداً فقط همین فایل‌ها رو می‌خونه (هیچ مدلی روی سرور لازم نیست).

منبع‌ها:
  1) بردار کلمه‌های fastText فارسی (cc.fa.300، لایسنس CC BY-SA 3.0)، حدود ۱٫۲ گیگ:
       https://dl.fbaipublicfiles.com/fasttext/vectors-crawl/cc.fa.300.vec.gz
     دانلودش کن و بذارش توی tools/wordlists/fasttext/ (این پوشه توی git نمی‌ره)
  2) لیلک و mainwords، همون منبع‌های واژه‌یاب (توضیحش بالای tools/build_word_lists.py)

کتابخونه‌ی لازم: numpy  (pip install numpy)

اجرا از ریشه‌ی پروژه:
    python tools/build_clue_ranks.py
    python tools/build_clue_ranks.py --answers 50     (فقط ۵۰ جواب، برای تست سریع)
    python tools/build_clue_ranks.py --vectors مسیر/فایل.vec.gz

خروجی (توی server/games/clue/words/):
  valid.txt          همه‌ی کلمه‌هایی که می‌شه حدس زد (اسم، صفت و قید لیلک که بردار دارن)
  answers.txt        جواب‌های ممکن (اسم‌های آشنا، بدون کلمه‌های tools/clue_exclude.txt)
  ranks/<جواب>.txt   نزدیک‌ترین کلمه‌ها به اون جواب؛ خط ۱ خود جوابه (رتبه‌ی ۱)، خط ۲ رتبه‌ی ۲ و ...
کلمه‌ی بدی توی جواب‌ها دیدی، توی tools/clue_exclude.txt بنویس و دوباره اجرا کن.
"""
import argparse
import gzip
import shutil
import sys
from pathlib import Path

import numpy as np

# نرمال‌سازی و خوندن لیلک/وبلاگ‌ها همونیه که واژه‌یاب داره
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_word_lists import BLOGS, LILAK, LETTERS, normalize, read_blog_counts  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
VECTORS = ROOT / "tools/wordlists/fasttext/cc.fa.300.vec.gz"
EXCLUDE = ROOT / "tools/clue_exclude.txt"
OUT = ROOT / "server/games/clue/words"

TOP = 1000  # برای هر جواب این‌قدر کلمه‌ی نزدیک ذخیره می‌شه؛ بقیه توی بازی «دور» حساب می‌شن
MAX_LINES = 300_000  # فقط این‌قدر خط اول fastText (کلمه‌های رایج‌تر اول فایلن)
ANSWER_COUNT = 500  # چندتا جواب ساخته بشه (رایج‌ترها)
MIN_BLOG = 300  # حداقل تکرار توی وبلاگ‌ها برای اینکه کلمه برای جواب «آشنا» باشه
ANSWER_LENGTH = (3, 8)  # طول جواب (تعداد حرف)

# نوع کلمه‌هایی که می‌شه حدس زد (فعل صرف‌شده، ضمیر، حرف اضافه و ... نه)
GUESS_TYPES = {
    "noun_singular", "noun_plural", "adjective",
    "adjective_comparative", "adjective_superlative", "adverb",
}
ANSWER_TYPES = {"noun_singular"}


def read_lilak_forms():
    """{کلمه‌ی نرمال‌شده: (شکل نمایشی، مجموعه‌ی نوع‌ها)}"""
    words = {}
    for line in LILAK.read_text(encoding="utf8").splitlines():
        if line.startswith("#") or not line.strip():
            continue
        parts = line.strip().split(",")
        form = parts[0].strip()
        kind = parts[1] if len(parts) > 1 else ""
        key = normalize(form)
        if key not in words:
            words[key] = (form, set())
        words[key][1].add(kind)
    return words


def read_exclude():
    if not EXCLUDE.exists():
        return set()
    words = set()
    for line in EXCLUDE.read_text(encoding="utf8").splitlines():
        for word in line.split("#")[0].split():
            words.add(normalize(word))
    return words


def read_vectors(path, wanted, max_lines):
    """بردار کلمه‌هایی که توی wanted هستن رو می‌خونه؛ برای هر کلمه فقط اولین (رایج‌ترین) شکل."""
    opener = gzip.open if path.suffix == ".gz" else open
    keys, rows = [], []
    seen = set()
    with opener(path, "rt", encoding="utf8", errors="replace") as f:
        first = f.readline().split()
        dim = int(first[1]) if len(first) == 2 else len(first) - 1
        if len(first) != 2:  # فایل بدون خط سرتیتر
            f.seek(0)
        for i, line in enumerate(f):
            if i >= max_lines:
                break
            parts = line.rstrip().split(" ")
            if len(parts) != dim + 1:
                continue
            key = normalize(parts[0])
            if key in seen or key not in wanted:
                continue
            seen.add(key)
            keys.append(key)
            rows.append(np.asarray(parts[1:], dtype=np.float32))
            if i % 50_000 == 0 and i:
                print(f"  {i:,} خط خونده شد، {len(keys):,} کلمه نگه داشته شد")
    if not rows:
        sys.exit("هیچ کلمه‌ای از لیلک توی فایل بردارها پیدا نشد. فایل درسته؟")
    matrix = np.vstack(rows)
    # طول هر بردار رو ۱ می‌کنیم تا ضرب داخلی همون «شباهت کسینوسی» بشه
    matrix /= np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-9
    return keys, matrix


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--vectors", type=Path, default=VECTORS, help="فایل fastText (.vec یا .vec.gz)")
    parser.add_argument("--answers", type=int, default=ANSWER_COUNT, help="تعداد جواب‌ها")
    parser.add_argument("--top", type=int, default=TOP, help="چندتا کلمه‌ی نزدیک برای هر جواب")
    parser.add_argument("--max-lines", type=int, default=MAX_LINES, help="چند خط اول فایل بردارها")
    args = parser.parse_args()

    for path in (args.vectors, LILAK, BLOGS):
        if not path.exists():
            sys.exit(f"فایل پیدا نشد: {path}\nاول توضیح بالای همین اسکریپت رو انجام بده.")

    lilak = read_lilak_forms()
    blogs = read_blog_counts()
    exclude = read_exclude()

    # کلمه‌هایی که می‌شه حدس زد: نوع درست، فقط حرف‌های فارسی، حداقل ۲ حرف
    guessable = {
        key for key, (_, kinds) in lilak.items()
        if kinds & GUESS_TYPES and len(key) >= 2 and set(key) <= LETTERS
    }
    print(f"لیلک: {len(guessable):,} کلمه‌ی قابل حدس. خوندن بردارها از {args.vectors.name} ...")
    keys, matrix = read_vectors(args.vectors, guessable, args.max_lines)
    index = {key: i for i, key in enumerate(keys)}
    print(f"{len(keys):,} کلمه بردار دارن.")

    # جواب‌ها: اسم‌های رایج با طول مناسب که بردار دارن
    low, high = ANSWER_LENGTH
    answers = sorted(
        (
            key for key in keys
            if lilak[key][1] <= ANSWER_TYPES
            and low <= len(key) <= high
            and blogs[key] >= MIN_BLOG
            and key not in exclude
        ),
        key=lambda k: (-blogs[k], k),
    )[: args.answers]
    if not answers:
        sys.exit("هیچ جوابی پیدا نشد (MIN_BLOG یا ANSWER_LENGTH رو چک کن).")

    # از نو ساختن پوشه‌ی رتبه‌ها (همه‌ش خروجی همین اسکریپته)
    ranks_dir = OUT / "ranks"
    if ranks_dir.exists():
        shutil.rmtree(ranks_dir)
    ranks_dir.mkdir(parents=True)

    top = min(args.top, len(keys))
    for n, answer in enumerate(answers, 1):
        scores = matrix @ matrix[index[answer]]  # شباهت همه‌ی کلمه‌ها با جواب
        scores[index[answer]] = np.inf  # خود جواب همیشه رتبه‌ی ۱
        best = np.argpartition(-scores, top - 1)[:top]
        best = best[np.argsort(-scores[best], kind="stable")]
        lines = [lilak[keys[i]][0] for i in best]
        (ranks_dir / f"{answer}.txt").write_text("\n".join(lines) + "\n", encoding="utf8")
        if n % 50 == 0 or n == len(answers):
            print(f"  {n}/{len(answers)} جواب: {answer} ← {'، '.join(lines[1:6])}")

    valid = sorted(lilak[k][0] for k in keys)
    (OUT / "valid.txt").write_text("\n".join(valid) + "\n", encoding="utf8")
    (OUT / "answers.txt").write_text("\n".join(lilak[k][0] for k in answers) + "\n", encoding="utf8")
    print(f"\nتموم شد: {len(valid):,} کلمه‌ی قابل حدس، {len(answers)} جواب، هر جواب {top} کلمه‌ی نزدیک.")
    print(f"خروجی: {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
