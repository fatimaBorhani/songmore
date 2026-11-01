import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateGuess } from '../guessLogic.js'

const artistsMap = new Map([
  ['song-A', new Set(['artist-x'])],
  ['song-B', new Set(['artist-x'])], // همون خواننده‌ی song-A
  ['song-C', new Set(['artist-y'])],
])

test('حدس درست وقتی همون آهنگه', () => {
  assert.equal(evaluateGuess('song-A', 'song-A', artistsMap), 'correct')
})

test('present وقتی آهنگ غلطه ولی خواننده مشترکه', () => {
  assert.equal(evaluateGuess('song-B', 'song-A', artistsMap), 'present')
})

test('incorrect وقتی نه آهنگ نه خواننده مشترک نیست', () => {
  assert.equal(evaluateGuess('song-C', 'song-A', artistsMap), 'incorrect')
})

test('آهنگی که توی نقشه نیست باعث خطا نمی‌شه', () => {
  assert.equal(evaluateGuess('song-unknown', 'song-A', artistsMap), 'incorrect')
})
