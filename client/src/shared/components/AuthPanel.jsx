import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { login, signup } from "../api.js";

// متن فارسی برای کدهای خطای سرور
const ERROR_TEXT = {
  INVALID_USERNAME: "نام کاربری باید ۳ تا ۲۰ حرف باشه: حروف انگلیسی، عدد یا _",
  WEAK_PASSWORD: "رمز باید حداقل ۸ کاراکتر باشه.",
  USERNAME_TAKEN: "این نام کاربری قبلاً گرفته شده.",
  INVALID_CREDENTIALS: "نام کاربری یا رمز اشتباهه.",
  TOO_MANY_ATTEMPTS:
    "تلاش‌های ناموفق زیاد بود. ۱۵ دقیقه‌ی دیگه دوباره امتحان کن.",
};

// نوار بالای صفحه: اگه وارد شده آیکن حساب، وگرنه دکمه‌ی ورود و پنجره‌ی ورود/ثبت‌نام
function AuthPanel({ user, onUserChange }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login"); // 'login' یا 'signup'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // پنجره‌ی ورود با Esc بسته می‌شه
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function switchMode(next) {
    setMode(next);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const action = mode === "login" ? login : signup;
      const loggedIn = await action(username.trim(), password);
      onUserChange(loggedIn);
      setOpen(false);
      setPassword("");
    } catch (err) {
      setError(
        ERROR_TEXT[err.message] || "یه مشکلی پیش اومد. دوباره امتحان کن.",
      );
    } finally {
      setBusy(false);
    }
  }

  // وارد شده: آیکن آدمک لینک به صفحه‌ی حسابه (خروج از حساب هم اونجاست)
  if (user) {
    return (
      <div className="auth-bar">
        {/* فقط آیکن آدمک؛ اسم کاربر فقط برای صفحه‌خوان و موقع نگه داشتن موس */}
        <NavLink to="/profile" className="auth-chip" aria-label={`حساب کاربری ${user.username}`} title={user.username}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </NavLink>
      </div>
    );
  }

  return (
    <>
      <div className="auth-bar">
        <button
          type="button"
          className="auth-link"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
        >
          ورود<span className="auth-link-more"> / ثبت‌نام</span>
        </button>
      </div>

      {/* پنجره‌ی ورود وسط صفحه؛ با کلیک بیرونش یا دکمه‌ی ✕ بسته می‌شه */}
      {open && (
        <div className="auth-backdrop" onClick={() => setOpen(false)}>
          <form
            className="auth-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="auth-head">
              <h2 id="auth-title">
                {mode === "login" ? "خوش برگشتی!" : "بیا تو لیگ"}
              </h2>
              <button
                type="button"
                className="auth-close"
                aria-label="بستن"
                onClick={() => setOpen(false)}
              >
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <p className="auth-lead">
              {mode === "login"
                ? "با حسابت وارد شو تا آمارت و جات توی لیگ هفته سر جاش باشه."
                : "با حساب، اسمت توی لیگ هفته میاد و آمارت روی همه‌ی دستگاه‌ها می‌مونه."}
            </p>
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={mode === "login" ? "active" : ""}
                onClick={() => switchMode("login")}
              >
                ورود
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={mode === "signup" ? "active" : ""}
                onClick={() => switchMode("signup")}
              >
                ساخت حساب
              </button>
            </div>

            <label className="auth-field">
              <span>نام کاربری</span>
              <input
                type="text"
                dir="ltr"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              {mode === "signup" && (
                <small>۳ تا ۲۰ حرف: حروف انگلیسی، عدد یا _</small>
              )}
            </label>

            <label className="auth-field">
              <span>رمز عبور</span>
              <input
                type="password"
                dir="ltr"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {mode === "signup" && <small>حداقل ۸ کاراکتر</small>}
            </label>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="auth-submit" disabled={busy}>
              {mode === "login" ? "ورود" : "ساخت حساب"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default AuthPanel;
