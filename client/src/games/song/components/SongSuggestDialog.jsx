// پنجره‌ی «آهنگت رو پیدا نکردیم؟»: اسم آهنگ (پرشده با همون جستجو) و خواننده (اختیاری) رو می‌فرسته
// فقط ذخیره می‌شه تا خودمون بررسی کنیم؛ با Esc، کلیک بیرون یا «بی‌خیال» بسته می‌شه
import { useEffect, useState } from "react";
import { suggestSong } from "../api.js";

const ERROR_TEXT = {
  INVALID_TITLE: "اسم آهنگ رو بنویس (حداقل دو حرف).",
  TITLE_TOO_LONG: "اسم آهنگ خیلی بلنده.",
  ARTIST_TOO_LONG: "اسم خواننده خیلی بلنده.",
  TOO_MANY_SUGGESTIONS: "امروز به اندازه‌ی کافی پیشنهاد دادی! فردا باز بیا.",
};

function SongSuggestDialog({ initialTitle, onClose }) {
  const [title, setTitle] = useState(initialTitle);
  const [artist, setArtist] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      await suggestSong(title, artist);
      setStatus("sent");
    } catch (err) {
      setError(
        ERROR_TEXT[err.message] || "نشد بفرستیم. یه بار دیگه امتحان کن.",
      );
      setStatus("idle");
    }
  }

  return (
    <div className="help-backdrop" onClick={onClose}>
      <div
        className="help-dialog song-suggest"
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-suggest-title"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "sent" ? (
          <>
            <span className="song-suggest-icon" aria-hidden="true">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h2 id="song-suggest-title">مرسی، رسید!</h2>
            <p>
              گذاشتیمش توی صف بررسی. اگه اضافه بشه، شاید یه روز همین آهنگ رو
              باید از ۰٫۱۵ ثانیه‌ش بشناسی!
            </p>
            <button
              type="button"
              className="help-ok"
              onClick={onClose}
              autoFocus
            >
              باشه
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="song-suggest-title">آهنگت رو پیدا نکردیم؟</h2>
            <p>بگو چیه تا بررسیش کنیم. قول نمی‌دیم، ولی تلاشمونو می‌کنیم!</p>
            <label className="auth-field">
              <span>اسم آهنگ</span>
              <input
                type="text"
                value={title}
                maxLength={80}
                required
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="auth-field">
              <span>خواننده (اگه می‌دونی)</span>
              <input
                type="text"
                value={artist}
                maxLength={60}
                onChange={(e) => setArtist(e.target.value)}
              />
            </label>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <div className="help-nav">
              <button type="button" className="help-prev" onClick={onClose}>
                بی‌خیال
              </button>
              <button
                type="submit"
                className="help-ok"
                disabled={status === "sending"}
              >
                {status === "sending" ? "یه لحظه..." : "بفرست"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SongSuggestDialog;
