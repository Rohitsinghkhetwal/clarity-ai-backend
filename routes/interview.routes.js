import express from 'express'
import { startInterview, getSession,submitAnswer,completeInterview, getUserHistory, responseFromLLm } from "../controller/interview.controller.js"
import { protect } from "../controller/auth.controller.js"
const router = express.Router()


router.use(protect)

router.post('/start', startInterview)
router.get('/:sessionId', getSession)
router.post('/:sessionId/answer',submitAnswer)
router.post('/:sessionId/complete',completeInterview)
router.get('/user/history',getUserHistory)
router.post('/score', responseFromLLm)

export default router;
