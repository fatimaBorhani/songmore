#!/usr/bin/env python3
"""
build_lyrics_game.py
داده‌ی بازی «شعر یادت نره» رو از روی متن‌های هم‌زمان ملودیفای و آهنگ‌های data/audio/ می‌سازه.

دو مرحله داره:

۱. پیشنهاد تطبیق (یه بار، یا هر وقت آهنگ تازه اومد):
       python tools/build_lyrics_game.py --suggest
   هر آهنگ فایل ملودیفای رو با آهنگ‌های songs.json تطبیق می‌ده: اول خواننده (اسم فارسی توی
   artists.json)، بعد بین آهنگ‌های همون خواننده با اسم آهنگ (فارسی رو به فینگلیش برمی‌گردونه و
   با اسم لاتین مقایسه می‌کنه) و طول آهنگ. نتیجه رو توی tools/lyrics_match.csv می‌نویسه.
   ستون‌ها: position, title, artist, song_id, offset_ms, note
   * ردیف‌هایی که song_id دارن وارد بازی می‌شن؛ اگه خالیه یا اشتباهه، دستی درستش کن.
   * offset_ms: اگه متن با فایل خودمون هم‌زمان نبود (مثلاً فایل ما چند ثانیه سکوت اول داره)،
     این‌قدر میلی‌ثانیه به همه‌ی زمان‌ها اضافه می‌شه (منفی هم می‌شه).
   * ردیف‌هایی که از قبل song_id دارن دست نمی‌خورن؛ ردیف‌های بی song_id دوباره امتحان می‌شن.

۲. ساختن داده‌ی بازی:
       python tools/build_lyrics_game.py
   برای هر ردیف با song_id یه «تیکه» انتخاب می‌کنه (سه خط قبل از سؤال + دو خط جواب)،
   دو کلیپ می‌بُره (قبل از سؤال و بعدش؛ اسم‌ها تصادفی تا جواب لو نره) توی CLIPS_DIR/lyrics/
   و همه رو توی data/lyrics/lyrics_game.json می‌نویسه. تیکه‌هایی که قبلاً ساخته شدن
   (و کلیپشون هست) دوباره ساخته نمی‌شن. سرور خودش فایل تازه رو می‌خونه.

ورودی: فایل ملودیفای (خروجی tools/export_melodify_lyrics.js) که باید توی data/lyrics/melodify.json
باشه، یا با --input مسیرش رو بده. پوشه‌ی data/lyrics/ توی git نمی‌ره (متن ترانه‌ها مال ما نیست).

به ffmpeg و ffprobe نیاز داره.
"""

import argparse
import csv
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
SONGS_JSON = os.path.join(ROOT, "data", "songs.json")
ARTISTS_JSON = os.path.join(ROOT, "data", "artists.json")
AUDIO_DIR = os.path.join(ROOT, "data", "audio")
LYRICS_DIR = os.path.join(ROOT, "data", "lyrics")
DEFAULT_INPUT = os.path.join(LYRICS_DIR, "melodify.json")
OUTPUT_JSON = os.path.join(LYRICS_DIR, "lyrics_game.json")
MATCH_CSV = os.path.join(ROOT, "tools", "lyrics_match.csv")
MATCH_FIELDS = ["position", "title", "artist", "song_id", "offset_ms", "note"]

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
DURATION_TOLERANCE_MS = 2500  # برای پیشنهاد تطبیق: فرق طول آهنگ ما و ملودیفای
TITLE_AUTO = 0.8              # شباهت اسم آهنگ از این بیشتر = تطبیق خودکار
TITLE_HINT = 0.6              # از این بیشتر = فقط پیشنهاد توی note
DURATION_WARN_MS = 8000       # اسم جوره ولی طول این‌قدر فرق داره: احتمالاً نسخه‌ی دیگه‌ست (زنده، ریمیکس)


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


# فارسی -> فینگلیش خیلی ساده، فقط برای مقایسه با اسم لاتین آهنگ‌ها
FA_TO_LATIN = {
    "ا": "a", "آ": "a", "ب": "b", "پ": "p", "ت": "t", "ث": "s", "ج": "j", "چ": "ch", "ح": "h",
    "خ": "kh", "د": "d", "ذ": "z", "ر": "r", "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s",
    "ض": "z", "ط": "t", "ظ": "z", "ع": "", "غ": "gh", "ف": "f", "ق": "gh", "ک": "k", "گ": "g",
    "ل": "l", "م": "m", "ن": "n", "و": "v", "ه": "h", "ی": "i", "ئ": "", "ء": "",
}


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


def title_similarity(fa_title, song):
    """اسم فارسی ملودیفای چقدر شبیه اسم (یا alt_title) آهنگ ماست؟ بین ۰ و ۱."""
    fa = strip_extra(fa_title)
    best = 0.0
    for cand in (song.get("title"), song.get("alt_title")):
        cand = strip_extra(cand)
        if not cand:
            continue
        if re.search("[\u0600-\u06FF]", cand):
            score = SequenceMatcher(None, norm(fa), norm(cand)).ratio()
        else:
            latin = "".join(FA_TO_LATIN.get(ch, ch) for ch in norm(fa))
            score = SequenceMatcher(None, skeleton(latin), skeleton(cand)).ratio()
        best = max(best, score)
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


def read_match_csv():
    if not os.path.exists(MATCH_CSV):
        return []
    with open(MATCH_CSV, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def write_match_csv(rows):
    with open(MATCH_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=MATCH_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in MATCH_FIELDS})


def track_key(track):
    return f"{track.get('position')}|{norm(track.get('title'))}|{norm(track.get('artist'))}"


def row_key(row):
    return f"{row.get('position')}|{norm(row.get('title'))}|{norm(row.get('artist'))}"


# ---------- مرحله‌ی ۱: پیشنهاد تطبیق ----------

def artist_ids_for(name, artists):
    """خواننده(های) ملودیفای -> شناسه‌های artists.json (از روی اسم فارسی، انگلیسی و aliases)."""
    parts = re.split(r"\s*(?:،|,|&|\bو\b|feat\.?|ft\.?)\s*", name or "")
    wanted = {norm(p) for p in parts if norm(p)}
    found = set()
    for artist in artists:
        names = [artist.get("persian"), artist.get("name"), *(artist.get("aliases") or [])]
        if any(norm(n) in wanted for n in names if n):
            found.add(artist["id"])
    return found


def pick_song(track, candidates, duration_of, row):
    """بین آهنگ‌های همون خواننده، درستش رو پیدا می‌کنه و song_id و note رو پر می‌کنه."""
    target = track.get("durationMs", 0)
    scored = sorted(((title_similarity(track.get("title"), s), s) for s in candidates), key=lambda x: -x[0])
    if scored and scored[0][0] >= TITLE_AUTO and (len(scored) == 1 or scored[1][0] < scored[0][0]):
        song = scored[0][1]
        row["song_id"] = song["id"]
        dur = duration_of(song)
        if dur is not None and abs(dur - target) > DURATION_WARN_MS:
            row["note"] = f"اسم جوره: {song['title']}، ولی طولش {abs(dur - target) // 1000} ثانیه فرق داره (نسخه‌ی دیگه؟ چک کن)"
        else:
            row["note"] = f"خودکار (اسم): {song['title']}"
        return
    close = [s for s in candidates if (d := duration_of(s)) is not None and abs(d - target) <= DURATION_TOLERANCE_MS]
    if len(close) == 1:
        row["song_id"] = close[0]["id"]
        row["note"] = f"خودکار (طول): {close[0]['title']} (چک کن)"
        return
    hints = [f"{s['id']}={s['title']}" for sim, s in scored if sim >= TITLE_HINT][:2]
    if hints:
        row["note"] = "شاید: " + "، ".join(hints)
    else:
        row["note"] = f"این آهنگ توی بازی نیست ({len(candidates)} آهنگ دیگه از این خواننده هست)"


def suggest(tracks):
    ffprobe = need_tool("ffprobe")
    songs = load_json(SONGS_JSON)
    artists = load_json(ARTISTS_JSON)
    rows = read_match_csv()
    durations = {}

    def duration_of(song):
        if song["id"] not in durations:
            path = os.path.join(AUDIO_DIR, song["file_name"])
            durations[song["id"]] = audio_duration_ms(ffprobe, path) if os.path.exists(path) else None
        return durations[song["id"]]

    # ردیف‌های بی song_id دوباره امتحان می‌شن؛ ردیف‌هایی که song_id دارن (شاید دستی) دست نمی‌خورن
    old = {row_key(r): r for r in rows}
    rows = []
    added = 0
    for track in tracks:
        prev = old.get(track_key(track))
        if prev and (prev.get("song_id") or "").strip():
            rows.append(prev)
            continue
        row = {"position": track.get("position"), "title": track.get("title"), "artist": track.get("artist"),
               "song_id": "", "offset_ms": (prev or {}).get("offset_ms") or "0", "note": ""}
        if track.get("status") != "ok":
            row["note"] = "متن هم‌زمان نداره"
        else:
            ids = artist_ids_for(track.get("artist"), artists)
            if not ids:
                row["note"] = "خواننده توی بازی نیست (اول آهنگ‌هاش رو به بازی اضافه کن)"
            else:
                candidates = [s for s in songs if any(a["id"] in ids for a in s.get("artists", []))]
                pick_song(track, candidates, duration_of, row)
        rows.append(row)
        if not prev:
            added += 1

    write_match_csv(rows)
    auto = sum(1 for r in rows if r.get("song_id"))
    print(f"✓ {os.path.relpath(MATCH_CSV, ROOT)} به‌روز شد ({added} ردیف تازه)")
    print(f"  {auto} از {len(rows)} ردیف song_id دارن. بقیه رو دستی پر کن (یا خالی بذار تا وارد بازی نشن).")


# ---------- مرحله‌ی ۲: ساختن تیکه‌ها ----------

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


def build(tracks, clips_dir):
    ffmpeg = need_tool("ffmpeg")
    songs = {s["id"]: s for s in load_json(SONGS_JSON)}
    rows = [r for r in read_match_csv() if (r.get("song_id") or "").strip()]
    if not rows:
        print("✗ هیچ ردیفی توی tools/lyrics_match.csv song_id نداره. اول --suggest رو بزن و فایل رو چک کن.")
        sys.exit(1)
    by_key = {track_key(t): t for t in tracks}

    old = {}
    if os.path.exists(OUTPUT_JSON):
        for p in load_json(OUTPUT_JSON).get("puzzles", []):
            old[p.get("matchKey")] = p

    out_dir = os.path.join(clips_dir, "lyrics")
    os.makedirs(out_dir, exist_ok=True)
    puzzles, made, kept, skipped = [], 0, 0, []

    for row in rows:
        key = row_key(row)
        song_id = row["song_id"].strip()
        offset = int(row.get("offset_ms") or 0)
        track = by_key.get(key)
        song = songs.get(song_id)
        label = f"{row.get('title')} / {row.get('artist')}"
        if not track or track.get("status") != "ok":
            skipped.append(f"{label}: توی فایل ملودیفای نیست یا متن هم‌زمان نداره")
            continue
        if not song:
            skipped.append(f"{label}: song_id «{song_id}» توی songs.json نیست")
            continue
        src = os.path.join(AUDIO_DIR, song["file_name"])
        if not os.path.exists(src):
            skipped.append(f"{label}: فایل صدا نیست ({song['file_name']})")
            continue

        prev = old.get(key)
        if (prev and prev.get("songId") == song_id and prev.get("offsetMs", 0) == offset
                and os.path.exists(os.path.join(clips_dir, prev["clipBefore"]))
                and os.path.exists(os.path.join(clips_dir, prev["clipAfter"]))):
            puzzles.append(prev)
            kept += 1
            continue

        k, lines = pick_excerpt(track.get("lines", []))
        if k is None:
            skipped.append(f"{label}: جای مناسبی برای سؤال پیدا نشد")
            continue

        clip_start = max(0, lines[k - LINES_BEFORE]["startMs"] + offset - LEAD_IN_MS)
        question_at = lines[k]["startMs"] + offset - STOP_BEFORE_MS - clip_start
        last = min(k + AFTER_LINES, len(lines) - 1)
        end_abs = lines[last]["startMs"] + offset if last > k + 1 else lines[k + 1]["startMs"] + offset + 8000
        end = min(end_abs - clip_start, question_at + MAX_AFTER_MS)
        first = max(0, k - LINES_BEFORE)
        excerpt = [{"ms": l["startMs"] + offset - clip_start, "text": l["text"].strip()}
                   for l in lines[first:last + 1] if l["startMs"] + offset - clip_start < end]

        before_name = f"lyrics/{secrets.token_hex(6)}.mp3"
        after_name = f"lyrics/{secrets.token_hex(6)}.mp3"
        cut(ffmpeg, src, clip_start, question_at, os.path.join(clips_dir, before_name))
        cut(ffmpeg, src, clip_start + question_at, end - question_at, os.path.join(clips_dir, after_name))

        puzzles.append({
            "id": prev["id"] if prev else secrets.token_hex(5),
            "matchKey": key,
            "songId": song_id,
            "offsetMs": offset,
            "title": track.get("title"),
            "artist": track.get("artist"),
            "clipBefore": before_name,
            "clipAfter": after_name,
            "questionAtMs": question_at,
            "endMs": end,
            "answerIndex": k - first,
            "lines": excerpt,
        })
        made += 1

    os.makedirs(LYRICS_DIR, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump({"puzzles": puzzles}, f, ensure_ascii=False, indent=1)
    print(f"✓ {len(puzzles)} تیکه توی {os.path.relpath(OUTPUT_JSON, ROOT)} ({made} تازه، {kept} از قبل)")
    if skipped:
        print(f"  {len(skipped)} ردیف رد شد:")
        for s in skipped:
            print("   -", s)


def main():
    parser = argparse.ArgumentParser(description="ساختن داده‌ی بازی «شعر یادت نره»")
    parser.add_argument("--input", default=DEFAULT_INPUT, help="فایل JSON ملودیفای")
    parser.add_argument("--suggest", action="store_true", help="فقط پیشنهاد تطبیق توی tools/lyrics_match.csv")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"✗ فایل ملودیفای پیدا نشد: {args.input}")
        print("  خروجی tools/export_melodify_lyrics.js رو توی data/lyrics/melodify.json بذار یا --input بده.")
        sys.exit(1)
    tracks = load_json(args.input).get("tracks", [])
    if args.suggest:
        suggest(tracks)
    else:
        clips_dir = os.environ.get("CLIPS_DIR") or os.path.join(ROOT, "clips")
        build(tracks, clips_dir)


if __name__ == "__main__":
    main()
