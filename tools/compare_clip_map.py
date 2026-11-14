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

STAGES = {'0.15', '0.5', '2', '8', '15'}


def kind(value):
    # شکل عادیِ هر آهنگ: یه دیکشنری با دقیقاً ۵ مرحله که هر کدوم اسم یه فایل (متن) دارن
    if isinstance(value, dict):
        ok = set(value.keys()) == STAGES and all(isinstance(v, str) for v in value.values())
        return 'عادی' if ok else 'دیکشنری با شکل دیگه'
    return f'غیرعادی ({type(value).__name__})'


def counts(ids):
    out = {}
    for k in ids:
        out[kind(new[k])] = out.get(kind(new[k]), 0) + 1
    return out


print(f'نسخه‌ی commit‌شده: {len(old)} آهنگ | فایل فعلی: {len(new)} آهنگ')
print(f'  آهنگ تازه:  {len(added)}  ({counts(added)})')
print(f'  حذف‌شده:    {len(removed)}' + (f'  -> {short(removed)}' if removed else ''))
print(f'  تغییرکرده:  {len(changed)}  ({counts(changed)})' + (f'  -> {short(changed)}' if changed else ''))

# تغییرکرده‌ها: اسم کلیپ‌ها عوض شده یا کلاً شکل ورودی؟
if changed:
    both_normal = [k for k in changed if kind(new[k]) == 'عادی']
    all_new_names = [k for k in both_normal if all(old[k][st] != new[k][st] for st in STAGES)]
    print(f'  از تغییرکرده‌ها: {len(both_normal)} تا هنوز شکل عادی دارن و {len(all_new_names)} تاشون هر ۵ اسم کلیپشون تازه‌ست')

# چند نمونه از ورودی‌های غیرعادی (برای فهمیدن اینکه چی نوشته شده)
odd = [k for k in added + changed if kind(new[k]) != 'عادی']
if odd:
    print()
    print('نمونه‌ی ورودی‌های غیرعادی:')
    for k in odd[:3]:
        print(f'  {k}: {json.dumps(new[k], ensure_ascii=False)[:150]}')
        if k in old:
            print(f'     (قبلاً: {json.dumps(old[k], ensure_ascii=False)[:150]})')

# کلیپ‌های آهنگ‌های تازه (و تغییرکرده‌ها) روی دیسک هستن؟ (فقط برای ورودی‌های عادی)
normal = [k for k in added + changed if kind(new[k]) == 'عادی']
if os.path.isdir(CLIPS_DIR):
    missing = sorted({k for k in normal for name in new[k].values() if not os.path.isfile(os.path.join(CLIPS_DIR, name))})
    print(f'  آهنگ‌های تازه/تغییرکرده‌ای که فایل کلیپشون توی {CLIPS_DIR} نیست: {len(missing)}' + (f'  -> {short(missing)}' if missing else ''))
else:
    print(f'  (پوشه‌ی کلیپ‌ها پیدا نشد: {CLIPS_DIR}؛ چک وجود فایل‌ها رد شد)')

print()
if odd:
    print('هشدار: بعضی ورودی‌ها شکل عادی ندارن (سرور فقط شکل «۵ مرحله ← اسم فایل» رو می‌فهمه). commit نکن و جواب رو برام بفرست.')
elif not removed and not changed:
    print('نتیجه: فقط آهنگ تازه اضافه شده و ورودی‌های قدیمی دست‌نخورده‌ان. مشکلی نیست.')
    print('(اگه git هنوز کل فایل رو تغییرکرده نشون می‌ده، به‌خاطر ترتیب یا فرمت نوشتنه؛ مهم نیست.)')
else:
    print('هشدار: ورودی‌های قدیمی حذف یا عوض شدن. قبل از commit بگو چی شده؛ بقیه‌ی تیم با کلیپ‌های قدیمی کار می‌کنن.')
