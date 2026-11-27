#!/usr/bin/env python3
"""سنجش کیفیت رتبه‌های «جوربندی»: جفت‌کلمه‌هایی که «باید نزدیک باشن» چه رتبه‌ای می‌گیرن؟

جفت‌ها توی tools/clue_pairs.txt هستن (هر خط: جواب و یه کلمه‌ی مرتبط، مثل «انسان زن»).
رتبه دقیقاً مثل سرور حساب می‌شه (شباهت کسینوسی؛ شکل‌های forms.txt رتبه‌ی کلمه‌ی اصلی رو می‌گیرن).
هر چی رتبه کوچیک‌تر، بهتر. تا ۳۰۰ توی بازی آبی نشون داده می‌شه.

اجرا از ریشه‌ی پروژه:
    python tools/check_clue_pairs.py                                  (داده‌ی فعلی بازی)
    python tools/check_clue_pairs.py server/games/clue/words tools/clue_test_out   (مقایسه‌ی دو پوشه)
    python tools/check_clue_pairs.py --top 20                         (۲۰ کلمه‌ی نزدیک هر جواب)

کتابخونه‌ی لازم: numpy
"""
import argparse
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_word_lists import normalize  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DIR = ROOT / "server/games/clue/words"
PAIRS = ROOT / "tools/clue_pairs.txt"
WARM = 300  # مثل WARM_MAX توی client/src/games/clue/clue.js


class Words:
    """داده‌ی یه پوشه (valid.txt، vectors.bin و forms.txt اختیاری) و رتبه‌ها مثل سرور."""

    def __init__(self, folder):
        self.folder = folder
        self.words = [w.strip() for w in (folder / "valid.txt").read_text(encoding="utf8").splitlines() if w.strip()]
        self.keys = [normalize(w) for w in self.words]
        self.index = {k: i for i, k in enumerate(self.keys)}
        raw = (folder / "vectors.bin").read_bytes()
        count, dim = np.frombuffer(raw[:8], dtype="<u4")
        if count != len(self.words):
            sys.exit(f"{folder}: vectors.bin با valid.txt جور نیست.")
        scales = np.frombuffer(raw[8 : 8 + 4 * count], dtype="<f4")
        vectors = np.frombuffer(raw[8 + 4 * count :], dtype=np.int8).reshape(count, dim)
        self.matrix = vectors.astype(np.float32) * scales[:, None]
        self.base_of = {}
        forms = folder / "forms.txt"
        if forms.exists():
            for line in forms.read_text(encoding="utf8").splitlines():
                parts = line.split("\t")
                if len(parts) == 2:
                    form, base = normalize(parts[0]), normalize(parts[1])
                    if form in self.index and base in self.index and form != base:
                        self.base_of[form] = base
            for base in list(self.base_of.values()):
                self.base_of.pop(base, None)

    def ranks(self, answer):
        """(رتبه‌ی هر کلمه‌ی نرمال‌شده، کلمه‌ها به ترتیب رتبه) یا None اگه جواب نیست."""
        a = self.index.get(answer)
        if a is None:
            return None
        sims = self.matrix @ self.matrix[a]
        sims[a] = np.inf
        usable = [i for i in range(len(self.keys)) if i == a or self.keys[i] not in self.base_of]
        order = sorted(usable, key=lambda i: (-sims[i], i))
        rank = {self.keys[i]: r + 1 for r, i in enumerate(order)}
        for form, base in self.base_of.items():
            if form != answer:
                rank[form] = 2 if base == answer else rank[base]
        return rank, [self.words[i] for i in order]


def read_pairs(path):
    pairs = []
    for line in path.read_text(encoding="utf8").splitlines():
        parts = line.split("#")[0].split()
        if len(parts) >= 2:
            pairs.append((parts[0], parts[1]))
    return pairs


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("dirs", nargs="*", type=Path, default=[DEFAULT_DIR], help="پوشه(های) داده برای مقایسه")
    parser.add_argument("--pairs", type=Path, default=PAIRS, help="فایل جفت‌کلمه‌ها")
    parser.add_argument("--top", type=int, default=10, help="چندتا نزدیک‌ترین کلمه‌ی هر جواب نشون داده بشه")
    args = parser.parse_args()

    sets = [Words(d) for d in args.dirs]
    pairs = read_pairs(args.pairs)
    names = [f"[{i + 1}] {d}" for i, d in enumerate(args.dirs)]
    print("\n".join(names))

    # ۱) رتبه‌ی هر جفت توی هر پوشه
    print("\nرتبه‌ی کلمه‌ی دوم وقتی کلمه‌ی اول جوابه (کمتر = بهتر):")
    results = [[] for _ in sets]
    cache = [{} for _ in sets]
    for answer, word in pairs:
        cells = []
        for s, data in enumerate(sets):
            key = normalize(answer)
            if key not in cache[s]:
                cache[s][key] = data.ranks(key)
            got = cache[s][key]
            rank = got[0].get(normalize(word)) if got else None
            if got is None:
                cells.append("جواب نیست")
            elif rank is None:
                cells.append("کلمه نیست")
            else:
                results[s].append(rank)
                cells.append(f"{rank:>6,}{' ✓' if rank <= WARM else ''}")
        print(f"  {answer} ← {word}:  " + "   ".join(f"[{i + 1}] {c}" for i, c in enumerate(cells)))

    # ۲) خلاصه
    print("\nخلاصه:")
    for s, ranks in enumerate(results):
        if not ranks:
            print(f"  [{s + 1}] هیچ جفتی پیدا نشد")
            continue
        warm = sum(r <= WARM for r in ranks)
        print(f"  [{s + 1}] میانه‌ی رتبه {int(np.median(ranks)):,} · {warm} از {len(ranks)} جفت زیر {WARM} (آبی)")

    # ۳) نزدیک‌ترین کلمه‌های هر جواب
    if args.top:
        print(f"\n{args.top} کلمه‌ی نزدیک هر جواب:")
        for answer in dict.fromkeys(a for a, _ in pairs):
            for s in range(len(sets)):
                got = cache[s].get(normalize(answer))
                if got:
                    print(f"  [{s + 1}] {answer}: {'، '.join(got[1][1 : args.top + 1])}")


if __name__ == "__main__":
    main()
