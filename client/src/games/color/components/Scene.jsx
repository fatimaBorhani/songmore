// کارت رنگ مشترک سه مرحله (حفظ کردن، ساختن، نتیجه): وسط صفحه و توی هر سه مرحله یه اندازه
// panel: کارت اسلایدرها؛ روی صفحه‌ی بزرگ کنار کارت رنگ (جای خالی سمت راست)، روی صفحه‌ی کوچیک یه کارت جدا زیر کارت رنگ
// reveal: رنگ با یه دایره‌ی بزرگ‌شونده از وسط کارت میاد (فقط اول حفظ کردن)
function Scene({ label, background, ink, children, panel, reveal = false }) {
  return (
    <div className={panel ? 'color-scene has-panel' : 'color-scene'}>
      <section className={reveal ? 'color-stage reveal' : 'color-stage'} aria-label={label} style={{ background, color: ink }}>
        {children}
      </section>
      {panel && <div className="color-panel">{panel}</div>}
    </div>
  )
}

export default Scene
