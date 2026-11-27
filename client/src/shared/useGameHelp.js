// راهنمای هر بازی کی خودش باز بشه:
// - مهمان: هر بار که وارد بازی می‌شه
// - کاربر واردشده: فقط بار اول (روی سرور یادمون می‌مونه، پس روی همه‌ی دستگاه‌ها یه باره)
// بازیکن هر وقت خواست با دکمه‌ی چراغ دوباره بازش می‌کنه (openHelp)
import { useEffect, useRef, useState } from "react";
import { getHelpSeen, markHelpSeen } from "./api.js";

// لیست دیده‌شده‌ها برای هر کاربر فقط یه بار از سرور گرفته می‌شه
const seenCache = new Map(); // userId -> Promise<string[] | null>

function loadSeen(userId) {
  if (!seenCache.has(userId)) {
    seenCache.set(
      userId,
      getHelpSeen().catch(() => {
        seenCache.delete(userId); // دفعه‌ی بعد دوباره امتحان کن
        return null;
      }),
    );
  }
  return seenCache.get(userId);
}

// game: شناسه‌ی بازی (song، word، color، clue، survey)
// user: کاربر واردشده یا null
export function useGameHelp(game, user) {
  const userId = user?.id ?? null;
  const [open, setOpen] = useState(() => userId === null); // مهمان: اول بازی بازه
  const closedOnce = useRef(false); // توی همین صفحه یه بار بسته شده؟

  useEffect(() => {
    if (userId === null) return;
    // مهمان راهنما رو بست و بعد وارد حسابش شد: دیگه باز نکن، فقط برای حسابش ثبت کن
    if (closedOnce.current) {
      markHelpSeen(game).catch(() => {});
      seenCache.delete(userId);
      return;
    }
    let alive = true;
    loadSeen(userId).then((seen) => {
      if (alive && seen && !seen.includes(game) && !closedOnce.current)
        setOpen(true);
    });
    return () => {
      alive = false;
    };
  }, [userId, game]);

  function openHelp() {
    setOpen(true);
  }

  // «باشه» یا «رد کردن»: بسته می‌شه و برای حساب ثبت می‌شه که دیده
  function closeHelp() {
    setOpen(false);
    if (closedOnce.current) return;
    closedOnce.current = true;
    if (userId !== null) {
      markHelpSeen(game).catch(() => {}); // اگه نشد مهم نیست؛ فقط دفعه‌ی بعد دوباره باز می‌شه
      seenCache.delete(userId);
    }
  }

  return { helpOpen: open, openHelp, closeHelp };
}
