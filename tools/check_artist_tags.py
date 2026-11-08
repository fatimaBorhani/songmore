#!/usr/bin/env python3
"""
check_artist_tags.py
تگ «artist» توی خود فایل mp3 رو با لیست خواننده‌های همون آهنگ توی songs.json
مقایسه می‌کنه و اگه تگ یه اسمی داشت که توی داده‌مون برای اون آهنگ ثبت نشده،
گزارش می‌ده (مثلاً یه آهنگ که توی فایلش سه تا خواننده داره ولی توی songs.json
فقط یکیشون ثبت شده).

* فقط می‌خونه: songs.json/artists.json و فایل‌های آهنگ دست نمی‌خورن.
* چون تگ «artist» گاهی فقط خواننده‌های اصلی رو داره (نه feat.ها)، فقط حالتی
  رو گزارش می‌کنه که تگ یه اسمی داشته باشه که اصلاً توی داده‌ی اون آهنگ نیست؛
  برعکسش (داده feat. داره ولی تگ نداره) طبیعیه و مشکل نیست.

اجرا از ریشه‌ی پروژه:
    python tools/check_artist_tags.py
    python tools/check_artist_tags.py --limit 20     (فقط ۲۰ تا آهنگ، برای تست)

خروجی: tools/artist_tag_mismatches.csv (فقط آهنگ‌هایی که مغایرت دارن)
"""

import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONGS_JSON = os.path.join(ROOT, "data", "songs.json")
ARTISTS_JSON = os.path.join(ROOT, "data", "artists.json")
AUDIO_DIR = os.path.join(ROOT, "data", "audio")
OUTPUT_CSV = os.path.join(ROOT, "tools", "artist_tag_mismatches.csv")

SPLIT_PATTERN = re.compile(r"\s*(?:,|&|/|;|\bfeat\.?\b|\bft\.?\b|\band\b)\s*", re.IGNORECASE)


def find_ffprobe():
    path = shutil.which("ffprobe")
    if not path:
        print("✗ ffprobe پیدا نشد. ffmpeg رو نصب کن (ffprobe همراهش میاد).")
        sys.exit(1)
    return path


def read_artist_tag(ffprobe, audio_path):
    cmd = [ffprobe, "-v", "quiet", "-print_format", "json", "-show_format", audio_path]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        return ""
    try:
        info = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return ""
    tags = {k.lower(): v for k, v in (info.get("format", {}).get("tags") or {}).items()}
    return (tags.get("artist") or "").strip()


def split_names(raw):
    names = [n.strip() for n in SPLIT_PATTERN.split(raw) if n.strip()]
    return names


def norm(text):
    return re.sub(r"[^a-z0-9ا-ی]", "", (text or "").lower())


def build_artist_index(artists):
    """هر خواننده -> مجموعه‌ی همه‌ی اسم‌های نرمال‌شده‌ش (اصلی، فارسی، alias)."""
    index = {}
    for a in artists:
        names = {norm(a.get("name", "")), norm(a.get("persian", ""))}
        names.update(norm(n) for n in a.get("aliases", []))
        names.discard("")
        index[a["id"]] = names
    return index


def find_artist_by_name(name_norm, artists_by_id, artist_index):
    for artist_id, names in artist_index.items():
        if name_norm in names or any(name_norm in n or n in name_norm for n in names if n):
            return artist_id
    return None


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="تگ artist فایل‌ها رو با songs.json مقایسه می‌کنه")
    parser.add_argument("--audio-dir", default=AUDIO_DIR)
    parser.add_argument("--output", default=OUTPUT_CSV)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    ffprobe = find_ffprobe()
    with open(SONGS_JSON, encoding="utf-8") as f:
        songs = json.load(f)
    with open(ARTISTS_JSON, encoding="utf-8") as f:
        artists = json.load(f)

    artists_by_id = {a["id"]: a for a in artists}
    artist_index = build_artist_index(artists)

    songs_with_audio = [s for s in songs if os.path.isfile(os.path.join(args.audio_dir, s.get("file_name", "")))]
    if args.limit:
        songs_with_audio = songs_with_audio[: args.limit]

    rows = []
    for i, song in enumerate(songs_with_audio, start=1):
        audio_path = os.path.join(args.audio_dir, song["file_name"])
        tag = read_artist_tag(ffprobe, audio_path)
        if not tag:
            continue

        # اسم همه‌ی خواننده‌های همین آهنگ که توی داده‌مون ثبته
        linked_ids = [a["id"] for a in song.get("artists", [])]
        known_names = set()
        for artist_id in linked_ids:
            known_names |= artist_index.get(artist_id, set())
        # اسم خود آهنگ هم اضافه کن (گاهی توی تگ چیزی مثل "Title - Artist" میاد)
        known_names.add(norm(song.get("title", "")))

        missing = []
        for candidate in split_names(tag):
            cand_norm = norm(candidate)
            if not cand_norm or cand_norm in known_names:
                continue
            if any(cand_norm in n or n in cand_norm for n in known_names if n):
                continue
            existing_id = find_artist_by_name(cand_norm, artists_by_id, artist_index)
            status = f"توی artists.json هست ({existing_id}) ولی به این آهنگ وصل نیست" if existing_id else "توی artists.json هم نیست"
            missing.append(f"{candidate} [{status}]")

        if missing:
            rows.append({
                "id": song["id"],
                "title": song.get("title", ""),
                "file_name": song["file_name"],
                "current_credit": song.get("credit", ""),
                "tag_artist": tag,
                "missing_from_data": "; ".join(missing),
            })

        if i % 25 == 0:
            print(f"  {i} از {len(songs_with_audio)} آهنگ بررسی شد...")

    with open(args.output, "w", newline="", encoding="utf-8-sig") as f:
        fieldnames = ["id", "title", "file_name", "current_credit", "tag_artist", "missing_from_data"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print()
    print(f"✓ {len(songs_with_audio)} آهنگ بررسی شد")
    print(f"⚠ {len(rows)} آهنگ مغایرت دارن (تگ یه خواننده داره که توی songs.json نیست)")
    print(f"  خروجی: {args.output}")


if __name__ == "__main__":
    main()
