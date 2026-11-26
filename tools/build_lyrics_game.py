#!/usr/bin/env python3
"""
build_lyrics_game.py
داده‌ی بازی «شعر یادت نره» رو مستقیم از متن‌های هم‌زمان ملودیفای و فایل صدای همون آهنگ‌ها می‌سازه.
به آهنگ‌های جورزیک (songs.json و data/audio) کاری نداره.

قبلش دو تا چیز لازمه (هر دو توی data/lyrics/ که توی git نمی‌ره، چون متن و صدا مال ما نیست):
    data/lyrics/melodify.json   خروجی tools/export_melodify_lyrics.js
    data/lyrics/audio/          فایل صدای همون آهنگ‌ها (mp3، m4a و ...؛ اسم فایل مهم نیست
                                ولی بهتره اسم آهنگ توش باشه)

اجرا از ریشه‌ی پروژه (یه دستور):
    python tools/build_lyrics_game.py

کارهایی که می‌کنه:
  ۱. هر آهنگ ملودیفای رو با یکی از فایل‌های صدا جفت می‌کنه: از روی طول آهنگ (ffprobe) و
     اسم فایل (فارسی، یا فینگلیش که با اسم فارسی مقایسه می‌شه).
  ۲. برای هر آهنگ یه «تیکه» انتخاب می‌کنه: سه خط قبل از سؤال + دو خط جواب (حدود ۴۰٪ آهنگ).
  ۳. دو کلیپ می‌بُره (قبل از سؤال و بعدش؛ اسم تصادفی تا جواب لو نره) توی CLIPS_DIR/lyrics/.
  ۴. همه رو توی data/lyrics/lyrics_game.json می‌نویسه. سرور خودش فایل تازه رو می‌خونه.
تیکه‌هایی که قبلاً ساخته شدن (و کلیپشون هست) دوباره ساخته نمی‌شن. آهنگ تازه که اضافه کنی،
فقط همون ساخته می‌شه.

به ffmpeg و ffprobe نیاز داره.
"""

import argparse
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import unicodedata
from difflib import SequenceMatcher

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LYRICS_DIR = os.path.join(ROOT, "data", "lyrics")
DEFAULT_INPUT = os.path.join(LYRICS_DIR, "melodify.json")
DEFAULT_AUDIO = os.path.join(LYRICS_DIR, "audio")
OUTPUT_JSON = os.path.join(LYRICS_DIR, "lyrics_game.json")
AUDIO_EXTENSIONS = (".mp3", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".flac")

# جفت کردن آهنگ و فایل
DURATION_CLOSE_MS = 2000    # طول فایل و آهنگ ملودیفای این‌قدر نزدیک = احتمالاً همونه
NAME_SURE = 0.85            # اسم فایل این‌قدر شبیه = همونه (حتی اگه طول نخونه)
NAME_WITH_DURATION = 0.35   # با طول نزدیک، اسم حداقل این‌قدر شبیه باشه
DURATION_ONLY_MS = 1000     # اسم فایل هیچی نمی‌گه (مثل track07)؛ طول این‌قدر نزدیک و تنها گزینه = همونه

# انتخاب تیکه
LINES_BEFORE = 3            # چند خط قبل از سؤال پخش می‌شه
MIN_ANSWER_CHARS = 8        # هر خط جواب حداقل این‌قدر حرف (بدون فاصله)
MAX_ANSWER_CHARS = 70
MAX_BEFORE_MS = 22000       # کل بخش قبل از سؤال حداکثر این‌قدر
MIN_LINE_GAP_MS = 1500      # فاصله‌ی دو خط جواب
MAX_LINE_GAP_MS = 9000
TARGET_POSITION = 0.4       # ترجیحاً حدود ۴۰٪ آهنگ (معمولاً بعد از بند اول)
LEAD_IN_MS = 1200           # کلیپ این‌قدر قبل از اولین خط شروع می‌شه
STOP_BEFORE_MS = 150        # این‌قدر قبل از شروع خط جواب صدا قطع می‌شه
AFTER_LINES = 4             # بعد از جواب تا شروع چندمین خط پخش می‌شه
MAX_AFTER_MS = 20000

# فارسی -> فینگلیش خیلی ساده، فقط برای مقایسه با اسم لاتین فایل‌ها
FA_TO_LATIN = {
    "ا": "a", "آ": "a", "ب": "b", "پ": "p", "ت": "t", "ث": "s", "ج": "j", "چ": "ch", "ح": "h",
    "خ": "kh", "د": "d", "ذ": "z", "ر": "r", "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s",
    "ض": "z", "ط": "t", "ظ": "z", "ع": "", "غ": "gh", "ف": "f", "ق": "gh", "ک": "k", "گ": "g",
    "ل": "l", "م": "m", "ن": "n", "و": "v", "ه": "h", "ی": "i", "ئ": "", "ء": "",
}


def need_tool(name):
    path = shutil.which(name)
    if not path:
        print(f"✗ {name} پیدا نشد. اول نصبش کن.")
        sys.exit(1)
    return path


def norm(text):
    """نرمال‌سازی ساده‌ی فارسی برای مقایسه (مثل normalizePersian سرور)."""
    text = (text or "").lower().replace("ي", "ی").replace("ك", "ک")
    text = re.sub(r"[‌ً-ٰٟ]", "", text)
    return "".join(ch for ch in text if unicodedata.category(ch)[0] in "LN")


def strip_extra(title):
    """«(اجرای زنده)»، «(ورژن جدید)» و مثل اینا رو برمی‌داره."""
    return re.sub(r"[(\[].*?[)\]]", "", title or "").strip()


def skeleton(latin):
    """اسکلت حروف بی‌صدا (مصوت‌ها توی فینگلیش هر بار یه جور نوشته می‌شن)."""
    t = latin.lower()
    for a, b in (("kh", "x"), ("gh", "q"), ("sh", "c"), ("ch", "c"), ("zh", "j"), ("ou", "u")):
        t = t.replace(a, b)
    t = re.sub(r"[aeiouyvw]", "", t).replace("q", "g").replace("x", "k")
    t = "".join(ch for ch in t if ch.isalnum())
    return re.sub(r"(.)\1+", r"\1", t)


def name_similarity(fa_title, file_stem):
    """اسم آهنگ ملودیفای چقدر توی اسم فایل هست؟ بین ۰ و ۱.
    اسم فایل معمولاً «اسم آهنگ - خواننده» یا برعکسه، پس «توش هست» هم حساب می‌شه."""
    fa = norm(strip_extra(fa_title))
    if not fa:
        return 0.0
    if re.search("[؀-ۿ]", file_stem):
        a, b = fa, norm(file_stem)
    else:
        a = skeleton("".join(FA_TO_LATIN.get(ch, ch) for ch in fa))
        b = skeleton(file_stem)
    if not a or not b:
        return 0.0
    if a in b:
        return 1.0
    # بهترین تیکه‌ی هم‌اندازه‌ی اسم فایل
    best = SequenceMatcher(None, a, b).ratio()
    for start in range(0, max(1, len(b) - len(a) + 1)):
        best = max(best, SequenceMatcher(None, a, b[start:start + len(a)]).ratio())
    return best


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def audio_duration_ms(ffprobe, path):
    try:
        out = subprocess.run(
            [ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return int(float(out) * 1000)
    except (subprocess.CalledProcessError, ValueError):
        return None


def track_key(track):
    return f"{norm(track.get('title'))}|{norm(track.get('artist'))}"


# ---------- ۱. جفت کردن آهنگ‌ها و فایل‌ها ----------

def match_files(tracks, audio_dir, ffprobe):
    """{track_key: اسم فایل}؛ هر فایل فقط به یه آهنگ می‌رسه (اول مطمئن‌ترها)."""
    files = sorted(f for f in os.listdir(audio_dir) if f.lower().endswith(AUDIO_EXTENSIONS))
    durations = {f: audio_duration_ms(ffprobe, os.path.join(audio_dir, f)) for f in files}
    pairs = []
    for track in tracks:
        target = track.get("durationMs") or 0
        for f in files:
            name = name_similarity(track.get("title"), os.path.splitext(f)[0])
            dur = durations[f]
            close = dur is not None and target and abs(dur - target) <= DURATION_CLOSE_MS
            if name >= NAME_SURE or (close and name >= NAME_WITH_DURATION):
                pairs.append((name + (1 if close else 0), track_key(track), f))
    # فایل‌هایی که اسمشون هیچی نمی‌گه: فقط با طول، وقتی از دو طرف تنها گزینه‌ست
    near = {}
    for track in tracks:
        target = track.get("durationMs") or 0
        near[track_key(track)] = [f for f in files if durations[f] is not None and target
                                  and abs(durations[f] - target) <= DURATION_ONLY_MS]
    for key, close_files in near.items():
        if len(close_files) == 1:
            f = close_files[0]
            if sum(1 for other in near.values() if f in other) == 1:
                pairs.append((1.0, key, f))
    pairs.sort(key=lambda p: -p[0])
    matched, used = {}, set()
    for _, key, f in pairs:
        if key in matched or f in used:
            continue
        matched[key] = f
        used.add(f)
    unused = [f for f in files if f not in used]
    return matched, unused


# ---------- ۲. انتخاب تیکه و بریدن کلیپ ----------

def pick_excerpt(lines):
    """بهترین جای سؤال: اندیس خط اولِ جواب، یا None."""
    lines = [l for l in lines if (l.get("text") or "").strip()]
    candidates = []
    for k in range(LINES_BEFORE, len(lines) - 1):
        a, b = lines[k], lines[k + 1]
        la, lb = len(norm(a["text"])), len(norm(b["text"]))
        if not (MIN_ANSWER_CHARS <= la <= MAX_ANSWER_CHARS and MIN_ANSWER_CHARS <= lb <= MAX_ANSWER_CHARS):
            continue
        if a["startMs"] - lines[k - LINES_BEFORE]["startMs"] > MAX_BEFORE_MS:
            continue
        gap = b["startMs"] - a["startMs"]
        if not (MIN_LINE_GAP_MS <= gap <= MAX_LINE_GAP_MS):
            continue
        before = {norm(l["text"]) for l in lines[k - LINES_BEFORE:k]}
        # اگه جواب عین یکی از خط‌های پخش‌شده باشه، خیلی راحت می‌شه
        if norm(a["text"]) in before or norm(b["text"]) in before or norm(a["text"]) == norm(b["text"]):
            continue
        candidates.append(k)
    if not candidates:
        return None, lines
    target = TARGET_POSITION * len(lines)
    return min(candidates, key=lambda k: abs(k - target)), lines


def cut(ffmpeg, src, start_ms, length_ms, out_path):
    cmd = [
        ffmpeg, "-y", "-loglevel", "error",
        "-ss", f"{start_ms / 1000:.3f}", "-t", f"{length_ms / 1000:.3f}",
        "-i", src, "-vn", "-c:a", "libmp3lame", "-q:a", "4", out_path,
    ]
    subprocess.run(cmd, check=True)


def make_puzzle(ffmpeg, track, src, clips_dir, old_id):
    """یه تیکه از یه آهنگ می‌سازه (دو کلیپ می‌بُره)؛ اگه جای خوبی نداشت None."""
    k, lines = pick_excerpt(track.get("lines", []))
    if k is None:
        return None
    clip_start = max(0, lines[k - LINES_BEFORE]["startMs"] - LEAD_IN_MS)
    question_at = lines[k]["startMs"] - STOP_BEFORE_MS - clip_start
    last = min(k + AFTER_LINES, len(lines) - 1)
    end_abs = lines[last]["startMs"] if last > k + 1 else lines[k + 1]["startMs"] + 8000
    end = min(end_abs - clip_start, question_at + MAX_AFTER_MS)
    first = k - LINES_BEFORE
    excerpt = [{"ms": l["startMs"] - clip_start, "text": l["text"].strip()}
               for l in lines[first:last + 1] if l["startMs"] - clip_start < end]

    before_name = f"lyrics/{secrets.token_hex(6)}.mp3"
    after_name = f"lyrics/{secrets.token_hex(6)}.mp3"
    cut(ffmpeg, src, clip_start, question_at, os.path.join(clips_dir, before_name))
    cut(ffmpeg, src, clip_start + question_at, end - question_at, os.path.join(clips_dir, after_name))
    return {
        "id": old_id or secrets.token_hex(5),
        "matchKey": track_key(track),
        "sourceFile": os.path.basename(src),
        "songId": None,
        "title": track.get("title"),
        "artist": track.get("artist"),
        "clipBefore": before_name,
        "clipAfter": after_name,
        "questionAtMs": question_at,
        "endMs": end,
        "answerIndex": k - first,
        "lines": excerpt,
    }


def build(tracks, audio_dir, clips_dir):
    ffmpeg = need_tool("ffmpeg")
    ffprobe = need_tool("ffprobe")
    tracks = [t for t in tracks if t.get("status") == "ok"]
    matched, unused = match_files(tracks, audio_dir, ffprobe)

    old = {}
    if os.path.exists(OUTPUT_JSON):
        for p in load_json(OUTPUT_JSON).get("puzzles", []):
            old[p.get("matchKey")] = p

    os.makedirs(os.path.join(clips_dir, "lyrics"), exist_ok=True)
    puzzles, made, kept, no_file, no_spot = [], 0, 0, [], []
    for track in tracks:
        key = track_key(track)
        label = f"{track.get('title')} / {track.get('artist')}"
        file_name = matched.get(key)
        if not file_name:
            no_file.append(label)
            continue
        prev = old.get(key)
        if (prev and prev.get("sourceFile") == file_name
                and os.path.exists(os.path.join(clips_dir, prev["clipBefore"]))
                and os.path.exists(os.path.join(clips_dir, prev["clipAfter"]))):
            puzzles.append(prev)
            kept += 1
            continue
        puzzle = make_puzzle(ffmpeg, track, os.path.join(audio_dir, file_name), clips_dir, prev and prev.get("id"))
        if puzzle is None:
            no_spot.append(label)
            continue
        puzzles.append(puzzle)
        made += 1

    os.makedirs(LYRICS_DIR, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump({"puzzles": puzzles}, f, ensure_ascii=False, indent=1)

    print(f"✓ {len(puzzles)} تیکه توی {os.path.relpath(OUTPUT_JSON, ROOT)} ({made} تازه، {kept} از قبل)")
    if no_file:
        print(f"  {len(no_file)} آهنگ فایل صدا نداشت (یا اسم و طول فایلش جور نبود):")
        for s in no_file:
            print("   -", s)
    if no_spot:
        print(f"  {len(no_spot)} آهنگ جای مناسبی برای سؤال نداشت:")
        for s in no_spot:
            print("   -", s)
    if unused:
        print(f"  {len(unused)} فایل صدا به هیچ آهنگی نخورد:")
        for f in unused:
            print("   -", f)


def main():
    parser = argparse.ArgumentParser(description="ساختن داده‌ی بازی «شعر یادت نره»")
    parser.add_argument("--input", default=DEFAULT_INPUT, help="فایل JSON ملودیفای")
    parser.add_argument("--audio", default=DEFAULT_AUDIO, help="پوشه‌ی فایل‌های صدای همون آهنگ‌ها")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"✗ فایل ملودیفای پیدا نشد: {args.input}")
        print("  خروجی tools/export_melodify_lyrics.js رو با اسم melodify.json توی data/lyrics/ بذار.")
        sys.exit(1)
    if not os.path.isdir(args.audio):
        print(f"✗ پوشه‌ی صدا پیدا نشد: {args.audio}")
        print("  فایل صدای همون آهنگ‌ها رو توی data/lyrics/audio/ بذار (یا با --audio مسیرش رو بده).")
        sys.exit(1)
    clips_dir = os.environ.get("CLIPS_DIR") or os.path.join(ROOT, "clips")
    build(load_json(args.input).get("tracks", []), args.audio, clips_dir)


if __name__ == "__main__":
    main()
