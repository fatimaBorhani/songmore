#!/usr/bin/env python3
"""
make_initial_data.py
آهنگ‌های لیست زیر (همونایی که توی تلگرام فرستادی) رو پیدا می‌کنه و
با اسم استاندارد «اسم آهنگ-اسم خواننده.mp3» توی پوشه‌ی «دیتا اولیه» کپی می‌کنه.

    python make_initial_data.py .

* از songs_catalog.csv استفاده می‌کنه و فقط نسخه‌های keep=yes رو برمی‌داره، پس تکراری نمیره.
* اگه یه آهنگ دوبار توی لیست باشه، یه بار کپی میشه.
* فایل‌های اصلی سر جاشون می‌مونن (کپی میشن، نه جابه‌جا). اگه می‌خوای جابه‌جا بشن: --move
* آهنگ‌هایی که پیدا نشدن آخر کار نشون داده میشن.
"""

import argparse
import csv
import os
import re
import shutil
import sys

OUTPUT_FOLDER = "دیتا اولیه"

# (اسم آهنگ، خواننده) از روی عکس‌های تلگرام
WANTED = [
    ("Neghab", "Siavash Ghomayshi"), ("Ayne", "Farhad Mehrad"), ("Setareh", "Shadmehr Aghili"),
    ("Navaar", "Reza Yazdani"), ("Eshghet", "Reza Yazdani"), ("Nadaramet", "Mohsen Yeganeh"),
    ("Asre Paeizi", "Morteza Pashaei"), ("Eshgh Asan Nadarad", "Alireza Ghorbani"),
    ("Bache Mahal", "Zedbazi"), ("Ba To", "Ebi"), ("Zemestoon", "Hoomaan"), ("Roya", "Amir Khalvat"),
    ("Chelcheragh", "Reza Yazdani"), ("Hamishegi", "Shadmehr Aghili"), ("Bi Man", "Erfan Tahmasbi"),
    ("Koja Boodi", "Mohsen Chavoshi"), ("Niloofar Abi", "Reza Pishro"), ("Eshghe Bachegi", "The Don"),
    ("Sarnevesht", "Gdaal"), ("Akharin Ahang", "Ebi"), ("HMG", "Sami Beigi"), ("Taghdir", "Shadmehr Aghili"),
    ("Ay Eshgh", "Dariush"), ("Inhame Adam", "Haamim"), ("Engheza", "Shervin Hajipour"),
    ("Baraaye Man", "Googoosh"), ("Shab", "Arman Garshasbi"), ("Zendegi Hamine", "Arta"),
    ("Taavaan", "Ehsan Khajeh Amiri"), ("Ye Ghafas", "Shadmehr Aghili"), ("Yadegari", "Siavash Ghomayshi"),
    ("Donyaye In Roozaye Man", "Dariush"), ("Mara Bebakhsh", "Alireza Ghorbani"),
    ("Negarane Mani", "Morteza Pashaei"),
    ("Begoo Be Darak", "Shayea"), ("Be a Mountain and Don't Be Attached", "He and His Friends"),
    ("Kheili Rooza Gozasht", "Sirvan Khosravi"), ("Dele Man Havato Karde", "Amir Tataloo"),
    ("Farda Soraghe Man Bia", "Ali Azimi"), ("Khandehaye To", "Farzad Farzin"), ("Bargard", "Sijal"),
    ("To Hata", "Mohsen Yeganeh"), ("Khodafez", "Mehrad Hidden"), ("Tocka|тоска", "Naaji"),
    ("Avaz Shodi", "Ali Yasini"), ("Mirese Khabara", "Ali Yasini"), ("Nade Ghol", "Ali Yasini"),
    ("Faal", "The Don"), ("Hayaahoo", "Googoosh"), ("Age Mimoondi", "Xaniar Khosravi"),
    ("In Eshghe", "Sami Beigi"), ("Darandasht", "Mohsen Yeganeh"), ("Dooset Dashtam", "Mohsen Chavoshi"),
    ("Nakhla", "Sijal"), ("Gole Sangam", "Eljaan"), ("Gharibeh", "Hassan Shamaizadeh"),
    ("Khomari", "Mahyar"), ("Nesfe Raah", "Behzad Leito"), ("Dadim Raft Toro", "Behzad Leito"),
    ("Joorchin", "Mohsen Chavoshi"), ("Bi Gonah", "Alireza Ghorbani"), ("Yebaram Man", "Koorosh"),
    ("Too Ragi", "Shayea"), ("Berim Baham", "Alireza JJ"), ("Benshin Tamashayat Konam", "Arman Garshasbi"),
    ("Nakoni Bavar", "Zedbazi"), ("Donya", "Habib"), ("Mobham", "Black Cats"), ("Ashkaye Abi", "Seper"),
    ("Behet Ghol Midam", "Mohsen Yeganeh"), ("Eshareh", "Hayedeh"), ("Naborde Ranj", "Ehsan Khajeh Amiri"),
    ("Engar", "Dekamond"), ("Soghati", "Hayedeh"), ("Avaze Ghoo", "Sijal"),
    ("Ghabrestoone Hip Hop", "Reza Pishro"), ("Jomeh", "Farhad Mehrad"), ("Hamin Khoobe", "Ebi"),
    ("Daro Baz Kon", "Zedbazi"), ("Nashod Behet Begam", "Koorosh"), ("Nafas", "Mehdi Yarrahi"),
    ("Ashoobam", "Chaartaar"), ("Age Bere", "Arta"), ("Jazireh", "Siavash Ghomayshi"),
    ("Khodaye Binahayat", "Mehrad Hidden"), ("Pooste Shir", "Ebi"), ("Rose", "Sina Sae"),
    ("Akharin Yad", "Arman Garshasbi"),
    ("Naz", "Black Cats"), ("Lavand", "Bijan Mortazavi"), ("Dooset Daram", "7 Band"), ("Zan", "Viguen"),
    ("Parvaz", "Arian Band"), ("Soghoot", "Dariush"), ("Man Toro Mikham", "Kamran & Hooman"),
    ("Eshghe Tou Nemimirad", "Aref"), ("Az Daste To", "Kamyar"), ("Aroosi", "Sattar"),
    ("Fogholade", "Behzad Leito"), ("Do Panjereh", "Googoosh"), ("Dobareh To", "Ashvan"),
    ("Ey Joonam", "Sami Beigi"), ("Fxxkin Distance", "Hoomaan"), ("Be Man Fekr Kon", "Dariush"),
    ("Male Man Bash", "Amir Tataloo"), ("Doost Daram Zendegiro", "Sirvan Khosravi"),
    ("Komak Komak", "Shayan Eshraghi"), ("Bahaneh", "Moein"), ("Majnoon", "Moein"), ("Khalegh", "Moein"),
    ("Porteghale Man", "Marjan Farsad"), ("Mordab", "Hassan Shamaizadeh"), ("Rock A Chock", "Mehrad Hidden"),
    ("Bad Zaat", "Hiphopologist"),
]


def key(text):
    """برای مقایسه: فقط حروف و عدد، کوچیک، بدون فاصله"""
    return re.sub(r"[^a-z0-9؀-ۿ]", "", (text or "").lower())


def artist_key(name):
    return key(name)


def credit(row):
    featured = [n.strip() for n in row.get("featured", "").split(" & ") if n.strip()]
    if row.get("all_artists"):
        names = [n.strip() for n in row["all_artists"].split(";") if n.strip()]
        main = [n for n in names if n not in featured]
    else:
        main = [row.get("artist", "")]
    text = ", ".join(main[:-1]) + (" & " if len(main) > 1 else "") + main[-1]
    if featured:
        text += " (feat. " + (", ".join(featured[:-1]) + (" & " if len(featured) > 1 else "") + featured[-1]) + ")"
    return text


def safe(text):
    return " ".join(re.sub(r'[\\/:*?"<>|]', " ", text).split()).strip(" .")


def newest_catalog(folder):
    names = [f for f in os.listdir(folder) if re.fullmatch(r"songs_catalog(_\d+)?\.csv", f)]
    if not names:
        return None
    return os.path.join(folder, max(names, key=lambda f: os.path.getmtime(os.path.join(folder, f))))


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", nargs="?", default=".")
    parser.add_argument("--move", action="store_true", help="به‌جای کپی، جابه‌جا کن")
    args = parser.parse_args()

    catalog = newest_catalog(args.folder)
    if not catalog:
        print("✗ songs_catalog.csv پیدا نشد. اول python songs_catalog.py . رو بزن.")
        return
    with open(catalog, encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    # هر تکراری رو به نسخه‌ی keep=yes گروهش وصل کن تا تکراری کپی نشه
    keeper = {r["duplicate_group"]: r for r in rows if r.get("duplicate_group") and r.get("keep") == "yes"}

    out_dir = os.path.join(args.folder, OUTPUT_FOLDER)
    os.makedirs(out_dir, exist_ok=True)

    done, missing, chosen_ids = 0, [], set()
    for title, artist in WANTED:
        titles = {key(t) for t in title.split("|")}
        same_title = [r for r in rows if key(r["title"]) in titles
                      or key(r.get("alt_title", "")) in titles]
        wanted_artist = artist_key(artist)
        match = [r for r in same_title
                 if any(wanted_artist in artist_key(n) or artist_key(n) in wanted_artist
                        for n in re.split(r";| & ", r.get("all_artists") or r["artist"]) if n.strip())]
        if not match:
            missing.append(f"{title.split('|')[0]} - {artist}")
            continue
        match.sort(key=lambda r: r.get("keep") != "yes")
        row = match[0]
        if row.get("keep") != "yes":
            row = keeper.get(row.get("duplicate_group"), row)
        if row["id"] in chosen_ids:            # توی لیست دوبار بود
            continue
        chosen_ids.add(row["id"])

        source = os.path.join(args.folder, row["file_name"])
        if not os.path.exists(source):
            missing.append(f"{title} - {artist}  (فایلش پیدا نشد: {row['file_name']})")
            continue
        extension = os.path.splitext(row["file_name"])[1].lower()
        target = os.path.join(out_dir, f"{safe(row['title'])}-{safe(credit(row))}{extension}")
        if os.path.exists(target):
            done += 1
            continue
        (shutil.move if args.move else shutil.copy2)(source, target)
        done += 1

    print(f"✓ {done} آهنگ توی پوشه‌ی «{OUTPUT_FOLDER}» ریخته شد ({'جابه‌جا' if args.move else 'کپی'})")
    if missing:
        print(f"✗ {len(missing)} تا پیدا نشد:")
        for item in missing:
            print("   ", item)


if __name__ == "__main__":
    main()
