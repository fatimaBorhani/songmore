// انتخاب حالت بازی آهنگ: مسابقه‌ای (روزی ۳ آهنگ، توی لیگ) یا تمرینی (نامحدود، بدون امتیاز)
import { NavLink } from "react-router";

// (توضیح هر حالت توی راهنمای چراغه، نه زیر دکمه‌ها)
function ModeSwitch() {
  return (
    <div className="mode-switch-wrap">
      <nav className="mode-switch" aria-label="حالت بازی">
        <NavLink to="/song" end>
          مسابقه‌ای
        </NavLink>
        <NavLink to="/song/practice">تمرینی</NavLink>
      </nav>
    </div>
  );
}

export default ModeSwitch;
