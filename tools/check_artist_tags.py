#!/usr/bin/env python3
"""
check_artist_tags.py
اسم خواننده‌های هر آهنگ رو از تگ داخل فایل mp3 می‌خونه و با خواننده‌های
data/songs.json مقایسه می‌کنه تا آهنگ‌هایی که خواننده‌شون ناقصه پیدا بشن.
(مثلاً «Bargard-Sijal.mp3» که توی تگ‌ش سامی بیگی و بهزاد لیتو هم هستن.)

* فقط می‌خونه: songs.json، artists.json و فایل‌های آهنگ دست نمی‌خورن.
* از ffprobe استفاده می‌کنه (همراه ffmpeg نصب می‌شه؛ کتابخونه‌ی جدید لازم نیست).
* خروجی یه فایل CSV برای بررسی دستیه (با اکسل باز می‌شه):
      tools/artist_tag_check.csv
  هر ردیف یه آهنگه. ستون status می‌گه مشکل چیه، ستون approve رو خودت پر می‌کنی.

اجرا از ریشه‌ی پروژه:
    python tools/check_artist_tags.py
    python tools/check_artist_tags.py --limit 5            (فقط ۵ تا آهنگ، برای تست)
    python tools/check_artist_tags.py --audio-dir مسیر/پوشه (اگه آهنگ‌ها جای دیگه‌ان)

وضعیت‌ها (status):
    ok               خواننده‌های تگ و songs.json یکی‌ان
    missing_in_data  تگ خواننده‌ای داره که توی artists.json هست ولی برای این آهنگ ثبت نشده
    new_artist       تگ اسمی داره که اصلاً توی artists.json نیست (خواننده‌ی جدید)
    data_has_more    songs.json خواننده‌ای داره که توی تگ نیست (فقط برای اطلاع، پیشنهادی نداره)
    no_tag           فایل تگ خواننده نداره
    file_missing     فایل آهنگ پیدا نشد
"""

import argparse
import csv
import json
import os
import re
import sys

# از همین پوشه‌ی tools اسکریپت خوندن تگ‌ها رو استفاده می‌کنیم
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from read_song_tags import find_ffprobe, read_tags  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONGS_JSON = os.path.join(ROOT, "data", "songs.json")
ARTISTS_JSON = os.path.join(ROOT, "data", "artists.json")
CLIP_MAP_JSON = os.path.join(ROOT, "data", "clip_map.json")
AUDIO_DIR = os.path.join(ROOT, "data", "audio")
OUTPUT_CSV = os.path.join(ROOT, "tools", "artist_tag_check.csv")

# تگ‌هایی که اسم خواننده توشونه (با حروف کوچیک). «artist» خواننده‌ی اصلیه،
# بقیه گاهی همه‌ی خواننده‌ها رو دارن.
ARTIST_KEYS = ["artist", "tpe1", "artists", "album_artist", "albumartist", "tpe2"]

# جداکننده‌ی اسم‌ها توی یه تگ. «feat» جدا هست چون بعدش خواننده‌ی مهمانه.
FEAT_RE = re.compile(r"\s*[\(\[]?\s*\b(?:feat\.?|ft\.?|featuring)\s+", re.IGNORECASE)
SPLIT_RE = re.compile(
    r"\s*(?:;|/|\\|,|،|&|\+|\s+x\s+|\s+and\s+|\s+و\s+)\s*",
    re.IGNORECASE,
)


def normalize(text):
    """برای مقایسه‌ی اسم‌ها: حروف کوچیک، ي→ی، ك→ک، بدون نیم‌فاصله و اعراب."""
    text = (text or "").lower()
    text = text.replace("ي", "ی").replace("ك", "ک")
    text = re.sub(r"[‌‍ـً-ٰٟ]", "", text)
    text = re.sub(r"[\(\)\[\]\"'“”]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def compact(text):
    """نسخه‌ی فشرده: فاصله، نقطه و خط تیره هم حذف (BehzadLeito = Behzad Leito)."""
    return re.sub(r"[\s.\-_]", "", normalize(text))


def build_artist_index(artists):
    """اسم‌های هر خواننده (انگلیسی، فارسی، alias) -> id، با دو روش مقایسه."""
    exact, loose = {}, {}
    for a in artists:
        names = [a["name"], a.get("persian") or ""] + list(a.get("aliases") or [])
        for name in names:
            if not name.strip():
                continue
            exact.setdefault(normalize(name), a["id"])
            loose.setdefault(compact(name), a["id"])
    return exact, loose


def find_artist_id(name, exact, loose):
    return exact.get(normalize(name)) or loose.get(compact(name))


def split_tag_names(raw, protected):
    """
    متن تگ رو به [(اسم, نقش)] تبدیل می‌کنه.
    protected: اسم‌هایی که خودشون جداکننده دارن (مثل «Kamran & Hooman») و نباید بشکنن.
    نقش: main، یا featured برای اسم‌های بعد از feat / ft.
    """
    text = raw
    holders = {}
    # اسم‌های دارای جداکننده رو موقتاً با یه علامت عوض می‌کنیم تا شکسته نشن
    for i, name in enumerate(sorted(protected, key=len, reverse=True)):
        pattern = re.compile(re.escape(name), re.IGNORECASE)
        if pattern.search(text):
            key = f"\x00{i}\x00"
            holders[key] = name
            text = pattern.sub(key, text)

    main_part, *feat_parts = FEAT_RE.split(text)
    result = []
    for part, role in [(main_part, "main")] + [(p, "featured") for p in feat_parts]:
        for piece in SPLIT_RE.split(part):
            piece = piece.strip(" ()[]")
            for key, name in holders.items():
                piece = piece.replace(key, name)
            if piece:
                result.append((piece, role))
    return result


def tag_artist_names(tags, protected):
    """همه‌ی اسم‌های خواننده‌ی یه فایل: [(اسم، نقش)] بدون تکرار، با ترتیب تگ‌ها."""
    seen, result, raw_parts = set(), [], []
    for key in ARTIST_KEYS:
        raw = (tags.get(key) or "").strip()
        if not raw:
            continue
        raw_parts.append(raw)
        for name, role in split_tag_names(raw, protected):
            marker = normalize(name)
            if marker not in seen:
                seen.add(marker)
                result.append((name, role))
    return result, " | ".join(dict.fromkeys(raw_parts))


def check_song(song, tags, exact, loose, protected, artist_by_id):
    """وضعیت یه آهنگ رو با مقایسه‌ی تگ و songs.json حساب می‌کنه."""
    current = {a["id"]: a["role"] for a in song.get("artists", [])}
    names, raw = tag_artist_names(tags, protected)

    tag_ids, unknown = {}, []
    for name, role in names:
        artist_id = find_artist_id(name, exact, loose)
        if artist_id:
            # اگه یه خواننده هم main هم featured دیده شد، main می‌مونه
            if tag_ids.get(artist_id) != "main":
                tag_ids[artist_id] = role
        else:
            unknown.append(name)

    to_add = [(i, r) for i, r in tag_ids.items() if i not in current]
    only_in_data = [i for i in current if i not in tag_ids]

    if not names:
        status = "no_tag"
    elif to_add:
        status = "missing_in_data"
    elif unknown:
        status = "new_artist"
    elif only_in_data:
        status = "data_has_more"
    else:
        status = "ok"

    def label(ids):
        return "; ".join(f"{i} ({artist_by_id[i]['name']})" if i in artist_by_id else i for i in ids)

    return {
        "status": status,
        "tag_raw": raw,
        "tag_artists": "; ".join(n for n, _ in names),
        "to_add": "; ".join(f"{i}:{r}" for i, r in to_add),
        "to_add_names": label([i for i, _ in to_add]),
        "new_artists": "; ".join(unknown),
        "only_in_data": label(only_in_data),
    }


# مشکل‌دارها اول بیان (بعد از این ترتیب، آهنگ‌های توی بازی جلوترن)
STATUS_ORDER = ["missing_in_data", "new_artist", "no_tag", "data_has_more", "file_missing", "ok"]


def main():
    parser = argparse.ArgumentParser(description="مقایسه‌ی خواننده‌های تگ mp3 با songs.json")
    parser.add_argument("--audio-dir", default=AUDIO_DIR, help="پوشه‌ی آهنگ‌های اصلی")
    parser.add_argument("--output", default=OUTPUT_CSV, help="مسیر فایل CSV خروجی")
    parser.add_argument("--limit", type=int, default=0, help="فقط چند تا آهنگ اول (برای تست)")
    args = parser.parse_args()

    ffprobe = find_ffprobe()
    with open(SONGS_JSON, encoding="utf-8") as f:
        songs = json.load(f)
    with open(ARTISTS_JSON, encoding="utf-8") as f:
        artists = json.load(f)
    in_game = set()
    if os.path.isfile(CLIP_MAP_JSON):
        with open(CLIP_MAP_JSON, encoding="utf-8") as f:
            in_game = set(json.load(f))
    if args.limit:
        songs = songs[: args.limit]

    artist_by_id = {a["id"]: a for a in artists}
    exact, loose = build_artist_index(artists)
    # اسم‌هایی که خودشون جداکننده دارن (مثل «Kamran & Hooman»)
    protected = [
        n
        for a in artists
        for n in [a["name"], a.get("persian") or ""] + list(a.get("aliases") or [])
        if n and SPLIT_RE.search(n)
    ]

    rows = []
    for i, song in enumerate(songs, start=1):
        audio_path = os.path.join(args.audio_dir, song.get("file_name", ""))
        row = {
            "id": song["id"],
            "title": song.get("title", ""),
            "credit": song.get("credit", ""),
            "in_game": "yes" if song["id"] in in_game else "no",
            "status": "",
            "current_artists": "; ".join(f"{a['id']}:{a['role']}" for a in song.get("artists", [])),
            "tag_raw": "",
            "tag_artists": "",
            "to_add": "",
            "to_add_names": "",
            "new_artists": "",
            "only_in_data": "",
            "approve": "",
        }
        if not song.get("file_name") or not os.path.isfile(audio_path):
            row["status"] = "file_missing"
        else:
            tags = read_tags(ffprobe, audio_path) or {}
            row.update(check_song(song, tags, exact, loose, protected, artist_by_id))
        rows.append(row)
        if i % 50 == 0:
            print(f"  {i} از {len(songs)} آهنگ خونده شد...")

    rows.sort(key=lambda r: (r["in_game"] != "yes", STATUS_ORDER.index(r["status"]), r["title"].lower()))

    # utf-8-sig تا اکسل حروف فارسی رو درست نشون بده
    with open(args.output, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["id"])
        writer.writeheader()
        writer.writerows(rows)

    counts = {s: sum(1 for r in rows if r["status"] == s) for s in STATUS_ORDER}
    print()
    print(f"✓ {len(rows)} آهنگ بررسی شد ({sum(1 for r in rows if r['in_game'] == 'yes')} تاش توی بازیه)")
    for status in STATUS_ORDER:
        if counts[status]:
            print(f"  {status}: {counts[status]}")
    problems = [r for r in rows if r["status"] == "missing_in_data"]
    if problems:
        print("  نمونه‌ی آهنگ‌هایی که خواننده‌شون ناقصه:")
        for r in problems[:8]:
            print(f"    {r['title']} ({r['credit']}) ← {r['to_add_names']}")
    print(f"  خروجی: {args.output}")


if __name__ == "__main__":
    main()
