import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePersian } from '../normalize.js'

test('ي و ك عربی به ی و ک فارسی تبدیل می‌شن', () => {
  assert.equal(normalizePersian('علي'), normalizePersian('علی'))
  assert.equal(normalizePersian('كامران'), normalizePersian('کامران'))
})

test('نیم‌فاصله و اعراب حذف می‌شن', () => {
  assert.equal(normalizePersian('می‌خواهم'), normalizePersian('میخواهم'))
  assert.equal(normalizePersian('مُحَمَّد'), normalizePersian('محمد'))
})

test('حروف انگلیسی کوچیک می‌شن', () => {
  assert.equal(normalizePersian('Neghab'), 'neghab')
  assert.equal(normalizePersian('NEGHAB'), normalizePersian('neghab'))
})

test('فاصله‌ها توی مقایسه مهم نیستن', () => {
  assert.equal(normalizePersian('علی یاسینی'), normalizePersian('علی  یاسینی'))
})

test('ورودی خالی خطا نمی‌ده', () => {
  assert.equal(normalizePersian(''), '')
  assert.equal(normalizePersian(undefined), '')
})
