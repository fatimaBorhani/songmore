// جدول هفته (زیر /api/weekly): امتیاز یکسان همه‌ی بازی‌ها از شنبه تا جمعه
import express from 'express'
import { getTodayDateString } from '../../core/today.js'
import { getWeeklyBoard } from './weekly.js'

export const weeklyRouter = express.Router()

// مهمان هم می‌تونه جدول رو ببینه؛ me فقط برای کاربر واردشده میاد
weeklyRouter.get('/', (req, res) => {
  res.json(getWeeklyBoard(getTodayDateString(), req.user ? req.user.id : null))
})
