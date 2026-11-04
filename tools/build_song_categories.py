#!/usr/bin/env python3
"""
build_song_categories.py
برای هر آهنگی که کلیپ داره، ژانر و دهه رو کنار هم می‌ذاره:

* ژانر از خواننده‌ی اصلی آهنگ میاد (tools/artist_genres.csv).
* سال از تگ فایل mp3 میاد (tools/song_tags.csv، خروجی read_song_tags.py).
* سال‌هایی که احتمالاً اشتباهن (آلبوم مجموعه، یا سالِ بعد از فوت خواننده)
  علامت می‌خورن تا دستی چک بشن.

خروجی: tools/song_categories.csv (برای بررسی دستی، با اکسل باز می‌شه)

اجرا از ریشه‌ی پروژه (اول read_song_tags.py رو اجرا کن):
    python tools/build_song_categories.py
"""

import argparse
import csv
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONGS_JSON = os.path.join(ROOT, "data", "songs.json")
CLIP_MAP_JSON = os.path.join(ROOT, "data", "clip_map.json")
ARTIST_GENRES_CSV = os.path.join(ROOT, "tools", "artist_genres.csv")
SONG_TAGS_CSV = os.path.join(ROOT, "tools", "song_tags.csv")
# سال‌هایی که دستی (با جستجو) درست شدن؛ این‌ها از سالِ تگ مهم‌ترن
YEAR_OVERRIDES_CSV = os.path.join(ROOT, "tools", "year_overrides.csv")
OUTPUT_CSV = os.path.join(ROOT, "tools", "song_categories.csv")

# اگه اسم آلبوم یکی از این‌ها رو داشته باشه، احتمالاً یه مجموعه است و سالش سالِ مجموعه‌ست.
# «Persian Music» عمداً نیست: سایت‌های دانلود به ته اسم آلبوم‌های واقعی هم اضافه‌ش می‌کنن.
COMPILATION_WORDS = ["golden", "collection", "best of", "greatest", "hits", "disc", "vol"]

# سال فوت چند خواننده؛ سالِ تگ بعد از این یعنی سالِ انتشار دوباره، نه آهنگ اصلی
DIED = {
    "hayedeh": 1990,
    "farhad-mehrad": 2002,
    "viguen": 2003,
    "morteza-pashaei": 2014,
}


def read_csv(path):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def decade_label(year):
    """۲۰۱۵ -> «دهه‌ی ۲۰۱۰»"""
    if not year:
        return ""
    decade = int(year) // 10 * 10
    return f"دهه‌ی {decade}"


def year_problem(year, album, main_artist_ids):
    if not year:
        return "سال نداره"
    lower = album.lower()
    for word in COMPILATION_WORDS:
        if word in lower:
            return f"آلبوم مجموعه به نظر میاد ({album.strip()})"
    for artist_id in main_artist_ids:
        died = DIED.get(artist_id)
        if died and int(year) > died:
            return f"بعد از فوت خواننده ({died})"
    return ""


def main():
    parser = argparse.ArgumentParser(description="ساختن جدول ژانر و دهه‌ی آهنگ‌ها")
    parser.add_argument("--tags", default=SONG_TAGS_CSV, help="خروجی read_song_tags.py")
    parser.add_argument("--output", default=OUTPUT_CSV)
    args = parser.parse_args()

    if not os.path.isfile(args.tags):
        print(f"✗ {args.tags} پیدا نشد. اول python tools/read_song_tags.py رو اجرا کن.")
        return

    with open(SONGS_JSON, encoding="utf-8") as f:
        songs = {s["id"]: s for s in json.load(f)}
    with open(CLIP_MAP_JSON, encoding="utf-8") as f:
        clip_ids = list(json.load(f).keys())
    genres = {row["artist_id"]: row for row in read_csv(ARTIST_GENRES_CSV)}
    tags = {row["id"]: row for row in read_csv(args.tags)}
    overrides = {}
    if os.path.isfile(YEAR_OVERRIDES_CSV):
        overrides = {row["id"]: row for row in read_csv(YEAR_OVERRIDES_CSV)}

    rows = []
    for song_id in clip_ids:
        song = songs[song_id]
        tag = tags.get(song_id, {})
        main_ids = [a["id"] for a in song["artists"] if a["role"] == "main"]

        # ژانر خواننده‌های اصلی؛ اگه با هم فرق داشتن، علامت می‌زنیم
        artist_genres = [genres[a]["genre"] for a in main_ids if a in genres]
        unique = list(dict.fromkeys(artist_genres))
        genre = unique[0] if unique else ""
        genre_note = ""
        if not unique:
            genre_note = "ژانر خواننده توی artist_genres.csv نیست"
        elif len(unique) > 1:
            genre_note = "خواننده‌ها ژانر متفاوت دارن: " + " / ".join(unique)
        elif genres[main_ids[0]]["confidence"] == "کم":
            genre_note = "ژانر خواننده مطمئن نیست"

        if song_id in overrides:
            # سال درست‌شده‌ی دستی؛ دیگه نیازی به بررسی نداره
            year = overrides[song_id]["year"]
            year_source = "اصلاح دستی"
            problem = ""
        else:
            year = tag.get("year", "")
            year_source = "تگ فایل" if year else ""
            problem = year_problem(year, tag.get("album", ""), main_ids)
        rows.append({
            "id": song_id,
            "title": song["title"],
            "credit": song["credit"],
            "genre": genre,
            "genre_fa": genres[main_ids[0]]["genre_fa"] if unique else "",
            "genre_note": genre_note,
            "year": year,
            "year_source": year_source,
            "decade": "" if problem else decade_label(year),
            "year_problem": problem,
        })

    with open(args.output, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    need_genre = sum(1 for r in rows if r["genre_note"])
    need_year = sum(1 for r in rows if r["year_problem"])
    print(f"✓ {len(rows)} آهنگ")
    print(f"  ژانر نیاز به چک دستی: {need_genre}")
    print(f"  سال نیاز به چک دستی: {need_year}")
    print(f"  خروجی: {args.output}")


if __name__ == "__main__":
    main()
