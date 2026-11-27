#!/usr/bin/env python3
"""ساخت داده‌ی بازی «جوربندی» با یه مدل معنایی جدید (به‌جای fastText).

fastText بیشتر «کلمه‌هایی که کنار هم میان» یا «شکلشون شبیهه» رو نزدیک می‌دونه
(برای همین «انسان» و «زن» رو دور می‌دید). مدل‌های جدید چندزبانه معنی رو بهتر می‌فهمن.
خروجی دقیقاً همون فایل‌های build_clue_ranks.py است، پس سرور و بازی عوض نمی‌شن.

مدل‌های پیشنهادی (اولین اجرا خودش از Hugging Face دانلود می‌کنه، حدود ۲ گیگ):
  intfloat/multilingual-e5-large   (پیش‌فرض)
  BAAI/bge-m3

کتابخونه‌ها:
    pip install numpy sentence-transformers
منبع‌های کلمه: لیلک و mainwords، همون منبع‌های جورچین (توضیحش بالای tools/build_word_lists.py)

اجرا از ریشه‌ی پروژه:
    python tools/build_clue_ranks_model.py
    python tools/build_clue_ranks_model.py --model BAAI/bge-m3
    python tools/build_clue_ranks_model.py --out tools/clue_test_out      (اول توی یه پوشه‌ی جدا امتحانش کن)
بعدش با tools/check_clue_pairs.py مقایسه کن که بهتر شده یا نه.

خروجی (پیش‌فرض server/games/clue/words/):
  valid.txt، answers.txt و vectors.bin   مثل build_clue_ranks.py
  forms.txt   شکل‌های دیگه‌ی یه کلمه (کتاب‌ها ← کتاب، زنان ← زن، بزرگ‌تر ← بزرگ)؛
              سرور این‌ها رو جای جدا توی رتبه‌ها حساب نمی‌کنه و رتبه‌ی کلمه‌ی اصلی رو بهشون می‌ده
"""
import argparse
import shutil
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_word_lists import BLOGS, LILAK, LETTERS, read_blog_counts  # noqa: E402
from build_clue_ranks import (  # noqa: E402
    ANSWER_COUNT, ANSWER_LENGTH, ANSWER_TYPES, GUESS_TYPES, read_exclude, read_lilak_forms,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "server/games/clue/words"

MODEL = "intfloat/multilingual-e5-large"
VOCAB = 40_000  # حداکثر چندتا کلمه قابل حدس باشن (رایج‌ترها اول؛ لیلک حدود ۴۰ هزار تا داره)
MIN_BLOG = 50  # حداقل تکرار توی وبلاگ‌ها برای اینکه کلمه «آشنا» باشه و جواب بشه
DIMS = 256  # بردارها به این‌قدر بُعد کوچیک می‌شن تا فایل سبک بمونه (۰ = همون اندازه‌ی مدل)
BATCH = 256


# ---------- شکل‌های یه کلمه ----------

# (پسوند، چیزی که به‌جاش میاد، نوع‌هایی که کلمه باید داشته باشه)
PLURAL = {"noun_plural"}
COMPARE = {"adjective_comparative", "adjective_superlative"}
FORM_RULES = [
    ("ها", "", PLURAL),  # کتاب‌ها ← کتاب (نیم‌فاصله توی نرمال‌سازی حذف شده)
    ("گان", "ه", PLURAL),  # بندگان ← بنده
    ("یان", "", PLURAL),  # دانشجویان ← دانشجو
    ("ان", "", PLURAL),  # زنان ← زن
    ("ات", "", PLURAL),  # تحقیقات ← تحقیق
    ("ترین", "", COMPARE),  # بزرگ‌ترین ← بزرگ
    ("تر", "", COMPARE),  # بزرگ‌تر ← بزرگ
]


def find_forms(keys, lilak):
    """{شکل: کلمه‌ی اصلی} فقط برای وقتی که هر دو توی keys هستن (حدس اشتباه کمتر)."""
    have = set(keys)
    forms = {}
    for key in keys:
        kinds = lilak[key][1]
        for suffix, repl, need in FORM_RULES:
            if not kinds & need or not key.endswith(suffix):
                continue
            base = key[: -len(suffix)] + repl
            if len(base) >= 2 and base in have and base != key:
                forms[key] = base
                break
    # کلمه‌ی اصلی خودش نباید شکلِ یه کلمه‌ی دیگه باشه
    return {form: base for form, base in forms.items() if base not in forms}


# ---------- مدل ----------

def make_encoder(model_name, batch):
    """یه تابع که لیست کلمه‌ها رو می‌گیره و بردارهاشون رو (هر سطر یه کلمه) برمی‌گردونه."""
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        sys.exit("کتابخونه‌ی sentence-transformers نصب نیست:\n    pip install sentence-transformers")
    print(f"بارگذاری مدل {model_name} (بار اول دانلود می‌شه و طول می‌کشه) ...")
    model = SentenceTransformer(model_name)
    # مدل‌های e5 قبل از متن «query: » می‌خوان
    prefix = "query: " if "e5" in model_name.lower() else ""

    def encode(words):
        return model.encode(
            [prefix + w for w in words], batch_size=batch, show_progress_bar=True,
            normalize_embeddings=True, convert_to_numpy=True,
        ).astype(np.float32)

    return encode


def reduce_dims(matrix, dims):
    """بردارها رو با PCA کوچیک‌تر می‌کنه (معنی اصلی می‌مونه، حجم کم می‌شه)."""
    if not dims or dims >= matrix.shape[1]:
        return matrix
    centered = matrix - matrix.mean(axis=0, keepdims=True)
    _, _, vt = np.linalg.svd(centered, full_matrices=False)
    return centered @ vt[:dims].T


def normalize_rows(matrix):
    return matrix / (np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-9)


# ---------- نوشتن خروجی (همون شکل build_clue_ranks.py) ----------

def write_output(out, keys, matrix, answers, lilak, forms):
    # ترتیب: الفبایی بر اساس شکل نمایشی؛ valid.txt و vectors.bin باید دقیقاً هم‌ترتیب باشن
    order = sorted(range(len(keys)), key=lambda i: lilak[keys[i]][0])
    keys = [keys[i] for i in order]
    matrix = matrix[order]

    # فشرده‌سازی: هر بردار با یه ضریب خودش به عددهای -۱۲۷ تا ۱۲۷ (یه بایت) تبدیل می‌شه
    scales = np.abs(matrix).max(axis=1) / 127.0
    scales[scales == 0] = 1.0
    quantized = np.round(matrix / scales[:, None]).astype(np.int8)

    out.mkdir(parents=True, exist_ok=True)
    with open(out / "vectors.bin", "wb") as f:
        f.write(np.array([len(keys), matrix.shape[1]], dtype="<u4").tobytes())
        f.write(scales.astype("<f4").tobytes())
        f.write(quantized.tobytes())
    show = lambda k: lilak[k][0]  # noqa: E731
    (out / "valid.txt").write_text("\n".join(show(k) for k in keys) + "\n", encoding="utf8")
    (out / "answers.txt").write_text("\n".join(show(k) for k in answers) + "\n", encoding="utf8")
    lines = sorted(f"{show(f)}\t{show(b)}" for f, b in forms.items())
    (out / "forms.txt").write_text("\n".join(lines) + "\n", encoding="utf8")
    old_ranks = out / "ranks"  # پوشه‌ی نسخه‌ی خیلی قدیمی
    if old_ranks.exists():
        shutil.rmtree(old_ranks)
    return keys, quantized, scales


def build(args, encode):
    """همه‌ی کار: انتخاب کلمه‌ها، بردار گرفتن، کوچیک کردن، شکل‌ها و نوشتن فایل‌ها."""
    lilak = read_lilak_forms()
    blogs = read_blog_counts()
    exclude = read_exclude()

    # کلمه‌های قابل حدس: نوع درست، فقط حرف فارسی، حداقل ۲ حرف؛ رایج‌ترها اول
    guessable = [
        key for key, (_, kinds) in lilak.items()
        if kinds & GUESS_TYPES and len(key) >= 2 and set(key) <= LETTERS
    ]
    guessable.sort(key=lambda k: (-blogs[k], k))
    keys = guessable[: args.vocab]
    print(f"لیلک: {len(guessable):,} کلمه‌ی قابل حدس؛ {len(keys):,} تا نگه داشته شد.")

    forms = find_forms(keys, lilak)
    print(f"{len(forms):,} شکل (جمع، صفت برتر و ...) به کلمه‌ی اصلی‌شون وصل شدن.")

    low, high = ANSWER_LENGTH
    answers = sorted(
        (
            key for key in keys
            if lilak[key][1] <= ANSWER_TYPES and low <= len(key) <= high
            and blogs[key] >= args.min_blog and key not in exclude and key not in forms
        ),
        key=lambda k: (-blogs[k], k),
    )[: args.answers]
    if not answers:
        sys.exit("هیچ جوابی پیدا نشد.")

    print("گرفتن بردار کلمه‌ها از مدل ...")
    matrix = normalize_rows(encode([lilak[k][0] for k in keys]))
    matrix = normalize_rows(reduce_dims(matrix, args.dims))

    keys, quantized, scales = write_output(args.out, keys, matrix, answers, lilak, forms)

    # چند نمونه با همون بردارهای فشرده (همون چیزی که سرور حساب می‌کنه، بدون شکل‌ها)
    index = {k: i for i, k in enumerate(keys)}
    approx = quantized.astype(np.float32) * scales[:, None]
    is_form = np.array([k in forms for k in keys])
    for answer in answers[:: max(1, len(answers) // 8)][:8]:
        scores = approx @ approx[index[answer]]
        scores[index[answer]] = -np.inf
        scores[is_form] = -np.inf
        best = np.argsort(-scores)[:5]
        print(f"  {lilak[answer][0]} ← {'، '.join(lilak[keys[i]][0] for i in best)}")

    size = (args.out / "vectors.bin").stat().st_size / 1e6
    print(f"\nتموم شد: {len(keys):,} کلمه، {len(answers)} جواب، {len(forms):,} شکل، vectors.bin {size:.1f} مگابایت.")
    print(f"خروجی: {args.out}")


def parse_args(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=MODEL, help="اسم مدل روی Hugging Face")
    parser.add_argument("--answers", type=int, default=ANSWER_COUNT, help="تعداد جواب‌ها")
    parser.add_argument("--vocab", type=int, default=VOCAB, help="حداکثر چندتا کلمه قابل حدس باشن")
    parser.add_argument("--min-blog", type=int, default=MIN_BLOG, help="حداقل تکرار توی وبلاگ‌ها برای جواب شدن")
    parser.add_argument("--dims", type=int, default=DIMS, help="اندازه‌ی بردارها بعد از کوچیک کردن (۰ = بدون تغییر)")
    parser.add_argument("--batch", type=int, default=BATCH, help="چندتا کلمه با هم به مدل داده بشه")
    parser.add_argument("--out", type=Path, default=OUT, help="پوشه‌ی خروجی")
    return parser.parse_args(argv)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    args = parse_args()
    for path in (LILAK, BLOGS):
        if not path.exists():
            sys.exit(f"فایل پیدا نشد: {path}\nاول توضیح بالای tools/build_word_lists.py رو انجام بده.")
    build(args, make_encoder(args.model, args.batch))


if __name__ == "__main__":
    main()
