// داده‌ی کوچیک و ثابت برای تست‌های «جورشعر» (به‌جای data/lyrics/lyrics_game.json واقعی).
// متن‌ها ساختگی‌ان (از هیچ آهنگ واقعی نیستن).
// باید قبل از import کردن سرور صدا زده بشه (مسیر از LYRICS_GAME_PATH خونده می‌شه).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function puzzle(id, songId, words) {
  return {
    id,
    songId,
    title: `آهنگ ${id}`,
    artist: 'خواننده‌ی نمونه',
    clipBefore: `lyrics/${id}-a.mp3`,
    clipAfter: `lyrics/${id}-b.mp3`,
    questionAtMs: 10000,
    endMs: 20000,
    answerIndex: 3,
    lines: words.map((text, i) => ({ ms: 1000 + i * 3000, text })),
  }
}

// خط‌های ۴ و ۵ (اندیس ۳ و ۴) جواب‌ان
export const ANSWER_LINES = ['ستاره‌ها رو یکی یکی می‌شمارم', 'تا صبح بیاد و تو برگردی خونه']
const LINES = ['شب اومد و کوچه آروم شد', 'چراغ اتاق هنوز روشنه', 'من پشت پنجره منتظرم', ...ANSWER_LINES, 'صدای پات میاد از دور', 'دلم دوباره گرم می‌شه']

export const FIXTURE_PUZZLES = [
  puzzle('p1', 'song-1', LINES),
  puzzle('p2', 'song-2', LINES),
  puzzle('p3', 'song-3', LINES),
  puzzle('p4', 'song-4', LINES),
]

export function useLyricsFixture(puzzles = FIXTURE_PUZZLES) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lyrics-game-'))
  const file = path.join(dir, 'lyrics_game.json')
  fs.writeFileSync(file, JSON.stringify({ puzzles }))
  process.env.LYRICS_GAME_PATH = file
  return file
}
