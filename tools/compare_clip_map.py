# مقایسه‌ی data/clip_map.json فعلی با نسخه‌ی commit‌شده (HEAD). فقط می‌خونه و هیچ‌چیز رو عوض نمی‌کنه.
# اجرا (از پوشه‌ی اصلی پروژه): python tools/compare_clip_map.py
# اختیاری: python tools/compare_clip_map.py مسیر/فایل-دیگه.json
#
# چرا؟ clip_map.json اسم فایل کلیپ هر آهنگ رو نگه می‌داره و بین همه‌ی ما مشترکه.
# اضافه شدن آهنگ تازه عادیه، ولی اگه ورودی‌های قدیمی عوض شده باشن (مثلاً کلیپ‌ها دوباره ساخته شدن)
# بقیه‌ی تیم کلیپ‌های قدیمی رو دارن و با فایل جدید بازی‌شون خراب می‌شه.
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEW_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'data', 'clip_map.json')
CLIPS_DIR = os.environ.get('CLIPS_DIR') or os.path.join(ROOT, 'clips')


def load_old():
    # نسخه‌ی commit‌شده (HEAD) از خود git خونده می‌شه
    out = subprocess.run(['git', 'show', 'HEAD:data/clip_map.json'], cwd=ROOT, capture_output=True)
    if out.returncode != 0:
        sys.exit('نسخه‌ی commit‌شده‌ی data/clip_map.json پیدا نشد (توی پوشه‌ی پروژه اجرا کن).')
    return json.loads(out.stdout)


def short(ids, n=8):
    ids = list(ids)
    return ', '.join(ids[:n]) + (f' ... (+{len(ids) - n})' if len(ids) > n else '')


old = load_old()
with open(NEW_PATH, encoding='utf-8-sig') as f:
    new = json.load(f)

added = [k for k in new if k not in old]
removed = [k for k in old if k not in new]
changed = [k for k in old if k in new and old[k] != new[k]]

print(f'نسخه‌ی commit‌شده: {len(old)} آهنگ | فایل فعلی: {len(new)} آهنگ')
print(f'  آهنگ تازه:  {len(added)}')
print(f'  حذف‌شده:    {len(removed)}' + (f'  -> {short(removed)}' if removed else ''))
print(f'  تغییرکرده:  {len(changed)}' + (f'  -> {short(changed)}   (همون آهنگ، ولی اسم کلیپ‌ها فرق داره)' if changed else ''))

# کلیپ‌های آهنگ‌های تازه (و تغییرکرده‌ها) روی دیسک هستن؟
if os.path.isdir(CLIPS_DIR):
    missing = [k for k in added + changed for name in new[k].values() if not os.path.isfile(os.path.join(CLIPS_DIR, name))]
    print(f'  آهنگ‌های تازه/تغییرکرده‌ای که فایل کلیپشون توی {CLIPS_DIR} نیست: {len(set(missing))}' + (f'  -> {short(sorted(set(missing)))}' if missing else ''))
else:
    print(f'  (پوشه‌ی کلیپ‌ها پیدا نشد: {CLIPS_DIR}؛ چک وجود فایل‌ها رد شد)')

print()
if not removed and not changed:
    print('نتیجه: فقط آهنگ تازه اضافه شده و ورودی‌های قدیمی دست‌نخورده‌ان. مشکلی نیست.')
    print('(اگه git هنوز کل فایل رو تغییرکرده نشون می‌ده، به‌خاطر ترتیب یا فرمت نوشتنه؛ مهم نیست.)')
else:
    print('هشدار: ورودی‌های قدیمی حذف یا عوض شدن. قبل از commit بگو چی شده؛ بقیه‌ی تیم با کلیپ‌های قدیمی کار می‌کنن.')
