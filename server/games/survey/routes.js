// مسیرهای API نظرسنجی «صد نفر گفتن» (همه زیر /api/survey)
//   GET  state      سؤال جاری، پیشرفت امروز و هدف جمعی
//   POST answer     { questionId, answer }
//   POST skip       { questionId }
//   POST more       «۵ سؤال دیگه»
//   POST suggest    { text }  پیشنهاد سؤال
import express from 'express'
import { getTodayDateString } from '../../core/today.js'
import { SurveyError, addMoreQuestions, addSuggestion, clearSurveyPlayer, getSurveyState, skipQuestion, submitAnswer } from './survey.js'

// حالت تست (همون پرچم npm run dev): دکمه‌ی «بازی دوباره (تست)» جواب‌های خود بازیکن رو پاک می‌کنه
export const SURVEY_TEST_MODE = process.argv.includes('--random-song')

export const surveyRouter = express.Router()

// اجرای یه کار؛ خطای SurveyError می‌شه جواب ۴۰۰ با همون کد
function handle(res, fn) {
  try {
    res.json({ ...fn(), testMode: SURVEY_TEST_MODE })
  } catch (e) {
    if (e instanceof SurveyError) return res.status(400).json({ error: e.message })
    throw e
  }
}

surveyRouter.get('/state', (req, res) => {
  handle(res, () => getSurveyState(req.playerKey, getTodayDateString()))
})

surveyRouter.post('/answer', (req, res) => {
  handle(res, () => submitAnswer(req.playerKey, getTodayDateString(), Number(req.body?.questionId), req.body?.answer))
})

surveyRouter.post('/skip', (req, res) => {
  handle(res, () => skipQuestion(req.playerKey, getTodayDateString(), Number(req.body?.questionId)))
})

surveyRouter.post('/more', (req, res) => {
  handle(res, () => addMoreQuestions(req.playerKey, getTodayDateString()))
})

surveyRouter.post('/suggest', (req, res) => {
  handle(res, () => {
    addSuggestion(req.playerKey, getTodayDateString(), req.body?.text)
    return { ok: true }
  })
})

// فقط حالت تست
surveyRouter.post('/test/reset', (req, res) => {
  if (!SURVEY_TEST_MODE) return res.status(404).json({ error: 'NOT_FOUND' })
  clearSurveyPlayer(req.playerKey)
  handle(res, () => getSurveyState(req.playerKey, getTodayDateString()))
})
