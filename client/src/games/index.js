// فهرست بازی‌های سایت؛ صفحه‌ی اول کارت‌ها رو از روی همین می‌سازه.
// برای اضافه کردن بازی جدید: یه پوشه توی games/ + یه خط اینجا + یه Route توی App.jsx
export const GAMES = [
  {
    id: 'song',
    path: '/song',
    title: 'حدس آهنگ',
    description: 'آهنگ امروز رو از چند صدم ثانیه‌ش بشناس.',
    icon: 'wave',
    ready: true,
  },
  {
    id: 'word',
    path: '/word',
    title: 'واژه‌یاب', // اسم موقت؛ هنوز قطعی نشده
    description: 'کلمه‌ی پنج‌حرفی امروز رو با شش حدس پیدا کن.',
    icon: 'grid',
    ready: true, // false = توی صفحه‌ی اول «به‌زودی» نشون داده می‌شه
  },
  {
    id: 'color',
    path: '/color',
    title: 'حافظه‌ی رنگ', // اسم موقت
    description: 'یه رنگ رو چند ثانیه ببین، بعد از حافظه بسازش.',
    icon: 'palette',
    ready: true,
  },
  {
    id: 'survey',
    path: '/survey',
    title: 'صد نفر گفتن', // اسم موقت
    description: 'به چند سؤال کوتاه جواب بده و به ساختن بازی بعدی کمک کن.',
    icon: 'chat',
    cta: 'جواب بده ←', // متن دکمه‌ی کارت (پیش‌فرض: «بازی کن ←»)
    ready: true,
  },
]
