#!/usr/bin/env python3
"""
make_clips.py
از روی آهنگ‌های data/audio/ کلیپ‌های ۵ مرحله‌ای (۰.۱۵، ۰.۵، ۲، ۸، ۱۵ ثانیه) می‌سازه.

* اول نقطه‌ی شروع واقعی صدا رو با فیلتر silencedetect ffmpeg پیدا می‌کنه،
  تا کلیپ‌های کوتاه وسط سکوت اول آهنگ نیوفتن.
* اسم فایل کلیپ‌ها تصادفیه (جواب بازی لو نره).
* نگاشت آهنگ -> اسم فایل‌های کلیپ توی data/clip_map.json ذخیره می‌شه؛
  این فایل هیچ‌وقت از نو ساخته نمی‌شه، فقط آهنگ‌های جدید بهش اضافه می‌شن.
* آهنگی که قبلاً توی clip_map.json داره، دوباره پردازش نمی‌شه.

اجرا از ریشه‌ی پروژه:
    python tools/make_clips.py
    python tools/make_clips.py --limit 3      (فقط ۳ تا آهنگ، برای تست)
    python tools/make_clips.py --song-id xxxx (فقط یه آهنگ خاص)

خروجی کلیپ‌ها توی پوشه‌ی CLIPS_DIR ریخته می‌شه (پیش‌فرض ./clips).
"""

import argparse
import json
import os
import re
import secrets
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONGS_JSON = os.path.join(ROOT, "data", "songs.json")
AUDIO_DIR = os.path.join(ROOT, "data", "audio")
CLIP_MAP_JSON = os.path.join(ROOT, "data", "clip_map.json")

STAGES = [0.15, 0.5, 2, 8, 15]

# برای تشخیص سکوت اول آهنگ: هر سکوتی که حداقل این‌قدر طول بکشه حساب می‌شه
SILENCE_NOISE_DB = "-50dB"
# کوتاه نگه‌ش داشتیم (حتی سکوت‌های خیلی کوتاه هم دیده بشن)، چون اگه این عدد
# از کوتاه‌ترین مرحله‌ی کلیپ (۰.۱۵ ثانیه) بزرگ‌تر باشه، سکوت‌های کوتاه‌تر از خودش
# اصلاً تشخیص داده نمی‌شن و کلیپ اول ممکنه کاملاً بی‌صدا دربیاد.
SILENCE_MIN_DURATION = 0.05
# این‌قدر قبل از نقطه‌ی تشخیص‌داده‌شده نگه می‌داریم که برش خیلی خشک نباشه
LEAD_IN_PAD = 0.08
# اگه سکوت اول آهنگ از این بیشتر بود، به جای اعتماد کور، فلگ می‌زنیم برای بررسی دستی
SUSPICIOUS_SILENCE_SECONDS = 10.0


def find_ffmpeg():
    path = shutil.which("ffmpeg")
    if not path:
        print("✗ ffmpeg پیدا نشد. اول نصبش کن.")
        sys.exit(1)
    return path


def detect_lead_in(ffmpeg, audio_path):
    """ثانیه‌ای که صدای واقعی آهنگ ازش شروع می‌شه رو برمی‌گردونه (0 یعنی از همون اول)."""
    cmd = [
        ffmpeg, "-i", audio_path,
        "-vn",  # بعضی mp3ها عکس جلد دارن که بعضاً خرابه؛ اصلاً لازمش نداریم
        "-af", f"silencedetect=noise={SILENCE_NOISE_DB}:d={SILENCE_MIN_DURATION}",
        "-f", "null", "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    log = result.stderr or ""

    starts = [float(m) for m in re.findall(r"silence_start:\s*([\d.]+)", log)]
    ends = [float(m) for m in re.findall(r"silence_end:\s*([\d.]+)", log)]

    if not starts or not ends:
        return 0.0, False  # آهنگ از همون اول صدا داره

    # فقط وقتی سکوتِ اول آهنگ مهمه (یعنی start نزدیک صفره)
    if starts[0] > 0.05:
        return 0.0, False

    lead_in = ends[0]
    suspicious = lead_in > SUSPICIOUS_SILENCE_SECONDS
    lead_in = max(0.0, lead_in - LEAD_IN_PAD)
    return lead_in, suspicious


def random_clip_name(used_names):
    while True:
        name = secrets.token_hex(8) + ".mp3"
        if name not in used_names:
            used_names.add(name)
            return name


def cut_clip(ffmpeg, audio_path, start, duration, out_path):
    cmd = [
        ffmpeg, "-y",
        "-ss", str(start),
        "-i", audio_path,
        "-t", str(duration),
        "-vn",  # بعضی mp3ها عکس جلد دارن که بعضاً خرابه؛ اصلاً لازمش نداریم
        "-c:a", "libmp3lame", "-q:a", "4",
        out_path,
    ]
    subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", check=True)


def load_clip_map():
    if os.path.exists(CLIP_MAP_JSON):
        with open(CLIP_MAP_JSON, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_clip_map(clip_map):
    with open(CLIP_MAP_JSON, "w", encoding="utf-8") as f:
        json.dump(clip_map, f, ensure_ascii=False, indent=2)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="فقط N تا آهنگ (برای تست)")
    parser.add_argument("--song-id", default=None, help="فقط همین یه آهنگ")
    args = parser.parse_args()

    ffmpeg = find_ffmpeg()
    clips_dir = os.environ.get("CLIPS_DIR", os.path.join(ROOT, "clips"))
    os.makedirs(clips_dir, exist_ok=True)

    with open(SONGS_JSON, encoding="utf-8") as f:
        songs = json.load(f)

    clip_map = load_clip_map()
    used_names = {name for stages in clip_map.values() for name in stages.values()}

    # فقط آهنگ‌هایی که فایل واقعی توی data/audio دارن
    songs = [s for s in songs if os.path.exists(os.path.join(AUDIO_DIR, s["file_name"]))]
    if args.song_id:
        songs = [s for s in songs if s["id"] == args.song_id]

    def all_clips_on_disk(stage_names):
        return all(os.path.exists(os.path.join(clips_dir, name)) for name in stage_names.values())

    # آهنگی که کلیپ‌هاش همین الان کامل روی دیسک هست رو رد کن.
    # (clip_map.json ممکنه از گیت اومده باشه ولی خود فایل‌های clips/ چون گیت‌ایگنورن
    # روی این سیستم نباشن؛ اون‌وقت باید دوباره ساخته بشن، نه رد بشن.)
    pending = [s for s in songs if not (s["id"] in clip_map and all_clips_on_disk(clip_map[s["id"]]))]
    if args.limit:
        pending = pending[: args.limit]

    done, suspicious_list = 0, []
    for song in pending:
        audio_path = os.path.join(AUDIO_DIR, song["file_name"])
        lead_in, suspicious = detect_lead_in(ffmpeg, audio_path)
        if suspicious:
            suspicious_list.append(f"{song['title']} ({song['id']}): {lead_in:.1f}s سکوت اول")

        # اگه این آهنگ قبلاً توی clip_map.json اسم داشت (مثلاً از commit یه هم‌تیمی)،
        # همون اسم‌های قبلی رو دوباره می‌سازیم تا clip_map.json عوض نشه؛
        # فقط فایلی که روی دیسک نیست رو می‌سازیم.
        stage_names = dict(clip_map.get(song["id"], {}))
        for stage in STAGES:
            key = str(stage)
            clip_name = stage_names.get(key) or random_clip_name(used_names)
            out_path = os.path.join(clips_dir, clip_name)
            if not os.path.exists(out_path):
                cut_clip(ffmpeg, audio_path, lead_in, stage, out_path)
            stage_names[key] = clip_name

        clip_map[song["id"]] = stage_names
        save_clip_map(clip_map)  # هر آهنگ که تموم شد ذخیره کن، نه فقط آخر کار
        done += 1
        print(f"✓ {song['title']} - {song['credit']}  (شروع صدا: {lead_in:.2f}s)")

    print(f"\n{done} آهنگ پردازش شد.")
    if suspicious_list:
        print(f"\n⚠ {len(suspicious_list)} تا سکوت اول مشکوک (بیشتر از {SUSPICIOUS_SILENCE_SECONDS:.0f} ثانیه)، دستی چک شن:")
        for item in suspicious_list:
            print("   ", item)


if __name__ == "__main__":
    main()
