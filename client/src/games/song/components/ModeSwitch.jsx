// انتخاب حالت بازی آهنگ: مسابقه‌ای (روزی یه آهنگ، توی لیگ) یا تمرینی (نامحدود، بدون امتیاز)
import { NavLink } from 'react-router'

function ModeSwitch({ mode }) {
  return (
    <div className="mode-switch-wrap">
      <nav className="mode-switch" aria-label="حالت بازی">
        <NavLink to="/song" end>
          مسابقه‌ای
        </NavLink>
        <NavLink to="/song/practice">تمرینی</NavLink>
      </nav>
      <p className="mode-hint">
        {mode === 'practice'
          ? 'تمرین نامحدود، بدون امتیاز. فقط توی فعالیت پروفایلت حساب می‌شه.'
          : 'روزی یه آهنگ برای همه. امتیازت میره توی جدول امتیاز امروز.'}
      </p>
    </div>
  )
}

export default ModeSwitch
