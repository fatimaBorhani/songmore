// کارت رنگ مشترک سه مرحله (حفظ کردن، ساختن، نتیجه): وسط صفحه و توی هر سه مرحله یه اندازه
// panel: کارت اسلایدرها؛ روی صفحه‌ی بزرگ کنار کارت رنگ (جای خالی سمت راست)، روی صفحه‌ی کوچیک یه کارت جدا زیر کارت رنگ
function Scene({ label, background, ink, children, panel }) {
  return (
    <div className={panel ? 'color-scene has-panel' : 'color-scene'}>
      <section className="color-stage" aria-label={label} style={{ background, color: ink }}>
        {children}
      </section>
      {panel && <div className="color-panel">{panel}</div>}
    </div>
  )
}

export default Scene
