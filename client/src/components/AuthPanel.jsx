import { useState } from 'react'
import { login, logout, signup } from '../api.js'

// متن فارسی برای کدهای خطای سرور
const ERROR_TEXT = {
  INVALID_USERNAME: 'نام کاربری باید ۳ تا ۲۰ حرف باشه: حروف انگلیسی، عدد یا _',
  WEAK_PASSWORD: 'رمز باید حداقل ۸ کاراکتر باشه.',
  USERNAME_TAKEN: 'این نام کاربری قبلاً گرفته شده.',
  INVALID_CREDENTIALS: 'نام کاربری یا رمز اشتباهه.',
  TOO_MANY_ATTEMPTS: 'تلاش‌های ناموفق زیاد بود. ۱۵ دقیقه‌ی دیگه دوباره امتحان کن.',
}

// نوار بالای صفحه: اگه وارد شده اسمش و دکمه‌ی خروج، وگرنه دکمه‌ی ورود و فرم ورود/ثبت‌نام
function AuthPanel({ user, onUserChange }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('login') // 'login' یا 'signup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const action = mode === 'login' ? login : signup
      const loggedIn = await action(username.trim(), password)
      onUserChange(loggedIn)
      setOpen(false)
      setPassword('')
    } catch (err) {
      setError(ERROR_TEXT[err.message] || 'یه مشکلی پیش اومد. دوباره امتحان کن.')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } finally {
      onUserChange(null)
    }
  }

  if (user) {
    return (
      <div className="auth-bar">
        <span className="auth-user">
          سلام، <bdi>{user.username}</bdi>
        </span>
        <button type="button" className="auth-link" onClick={handleLogout}>
          خروج
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="auth-bar">
        <button type="button" className="auth-link" onClick={() => setOpen(!open)} aria-expanded={open}>
          ورود / ثبت‌نام
        </button>
      </div>

      {open && (
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              ورود
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => switchMode('signup')}
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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {mode === 'signup' && <small>۳ تا ۲۰ حرف: حروف انگلیسی، عدد یا _</small>}
          </label>

          <label className="auth-field">
            <span>رمز عبور</span>
            <input
              type="password"
              dir="ltr"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {mode === 'signup' && <small>حداقل ۸ کاراکتر</small>}
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={busy}>
            {mode === 'login' ? 'ورود' : 'ساخت حساب'}
          </button>
        </form>
      )}
    </>
  )
}

export default AuthPanel
