// کارت رنگ مشترک سه مرحله (حفظ کردن، ساختن، نتیجه): وسط صفحه و توی هر سه مرحله یه اندازه
// panel: کارت اسلایدرها؛ روی صفحه‌ی بزرگ کنار کارت رنگ (جای خالی سمت راست)، روی صفحه‌ی کوچیک پایین خود کارت
function Scene({ label, background, ink, children, panel }) {
  return (
    <div className="color-scene">
      <section className="color-stage" aria-label={label} style={{ background, color: ink }}>
        {children}
      </section>
      {panel && <div className="color-panel">{panel}</div>}
    </div>
  )
}

export default Scene
