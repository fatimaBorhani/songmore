#!/usr/bin/env python3
"""
read_song_tags.py
ژانر و سال هر آهنگ رو از تگ‌های داخل فایل mp3 (ID3) می‌خونه.

* از ffprobe استفاده می‌کنه (همراه ffmpeg نصب می‌شه؛ کتابخونه‌ی جدید لازم نیست).
* فقط می‌خونه: songs.json و فایل‌های آهنگ دست نمی‌خورن.
* خروجی یه فایل CSV برای بررسی دستیه (با اکسل باز می‌شه):
      tools/song_tags.csv
* ژانرهای بی‌معنی (مثل اسم سایت یا «Other») جدا علامت می‌خورن.

اجرا از ریشه‌ی پروژه:
    python tools/read_song_tags.py
    python tools/read_song_tags.py --limit 5            (فقط ۵ تا آهنگ، برای تست)
    python tools/read_song_tags.py --audio-dir مسیر/پوشه (اگه آهنگ‌ها جای دیگه‌ان)
"""

import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONGS_JSON = os.path.join(ROOT, "data", "songs.json")
AUDIO_DIR = os.path.join(ROOT, "data", "audio")
OUTPUT_CSV = os.path.join(ROOT, "tools", "song_tags.csv")

# اسم تگ‌ها توی فایل‌های مختلف فرق داره؛ همه رو امتحان می‌کنیم (با حروف کوچیک)
GENRE_KEYS = ["genre", "tcon"]
YEAR_KEYS = ["date", "year", "tdrc", "tyer", "tdor", "originaldate", "originalyear", "release_date"]

# ژانرهایی که در واقع اطلاعاتی نمی‌دن
USELESS_GENRES = {
    "other", "others", "unknown", "misc", "none", "general",
    "persian", "iranian", "farsi", "music", "song", "mp3", "(12)",
}


def find_ffprobe():
    path = shutil.which("ffprobe")
    if not path:
        print("✗ ffprobe پیدا نشد. ffmpeg رو نصب کن (ffprobe همراهش میاد).")
        sys.exit(1)
    return path


def read_tags(ffprobe, audio_path):
    """همه‌ی تگ‌های فایل رو به شکل دیکشنری برمی‌گردونه (کلیدها با حروف کوچیک)."""
    cmd = [ffprobe, "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", audio_path]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        return None
    try:
        info = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return None

    tags = {}
    # تگ‌ها گاهی روی خود فایل‌ان، گاهی روی استریم صدا
    for stream in info.get("streams", []):
        for key, value in (stream.get("tags") or {}).items():
            tags[key.lower()] = value
    for key, value in (info.get("format", {}).get("tags") or {}).items():
        tags[key.lower()] = value
    return tags


def first_tag(tags, keys):
    for key in keys:
        value = (tags.get(key) or "").strip()
        if value:
            return value
    return ""


def clean_year(raw):
    """از متن‌هایی مثل 2015 یا 2015-03-01 یا 1394 فقط سال ۴ رقمی رو درمیاره."""
    match = re.search(r"(1[3-4]\d\d|19\d\d|20\d\d)", raw)
    if not match:
        return ""
    year = int(match.group(1))
    # سال شمسی (مثلاً ۱۳۹۴) رو به میلادی تقریبی تبدیل می‌کنیم
    if 1300 <= year < 1500:
        year += 621
    return str(year)


def judge_genre(genre):
    """اگه ژانر به درد نخوره (خالی، اسم سایت، «Other»...) دلیلش رو برمی‌گردونه."""
    if not genre:
        return "خالی"
    lower = genre.strip().lower()
    if lower in USELESS_GENRES:
        return "کلی/بی‌معنی"
    if re.search(r"(\.com|\.ir|\.net|www\.|https?://|@)", lower):
        return "اسم سایت"
    return ""


def main():
    parser = argparse.ArgumentParser(description="خوندن ژانر و سال از تگ فایل‌های آهنگ")
    parser.add_argument("--audio-dir", default=AUDIO_DIR, help="پوشه‌ی آهنگ‌های اصلی")
    parser.add_argument("--output", default=OUTPUT_CSV, help="مسیر فایل CSV خروجی")
    parser.add_argument("--limit", type=int, default=0, help="فقط چند تا آهنگ اول (برای تست)")
    args = parser.parse_args()

    ffprobe = find_ffprobe()
    with open(SONGS_JSON, encoding="utf-8") as f:
        songs = json.load(f)
    if args.limit:
        songs = songs[: args.limit]

    rows = []
    genre_counter = Counter()
    missing_files = 0

    for i, song in enumerate(songs, start=1):
        audio_path = os.path.join(args.audio_dir, song.get("file_name", ""))
        row = {
            "id": song["id"],
            "title": song.get("title", ""),
            "credit": song.get("credit", ""),
            "file_found": "yes",
            "genre": "",
            "genre_problem": "",
            "year": "",
            "raw_date": "",
            "album": "",
        }

        if not song.get("file_name") or not os.path.isfile(audio_path):
            row["file_found"] = "no"
            missing_files += 1
            rows.append(row)
            continue

        tags = read_tags(ffprobe, audio_path) or {}
        genre = first_tag(tags, GENRE_KEYS)
        raw_date = first_tag(tags, YEAR_KEYS)
        row.update({
            "genre": genre,
            "genre_problem": judge_genre(genre),
            "year": clean_year(raw_date),
            "raw_date": raw_date,
            "album": tags.get("album", ""),
        })
        if genre and not row["genre_problem"]:
            genre_counter[genre.strip()] += 1
        rows.append(row)

        if i % 25 == 0:
            print(f"  {i} از {len(songs)} آهنگ خونده شد...")

    # utf-8-sig تا اکسل حروف فارسی رو درست نشون بده
    with open(args.output, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["id"])
        writer.writeheader()
        writer.writerows(rows)

    # خلاصه
    found = [r for r in rows if r["file_found"] == "yes"]
    with_genre = sum(1 for r in found if r["genre"] and not r["genre_problem"])
    with_year = sum(1 for r in found if r["year"])
    print()
    print(f"✓ {len(rows)} آهنگ بررسی شد ({missing_files} تا فایلشون پیدا نشد)")
    print(f"  ژانر به‌دردبخور: {with_genre} از {len(found)}")
    print(f"  سال: {with_year} از {len(found)}")
    if genre_counter:
        print("  پرتکرارترین ژانرها:")
        for genre, count in genre_counter.most_common(10):
            print(f"    {genre}: {count}")
    print(f"  خروجی: {args.output}")


if __name__ == "__main__":
    main()
