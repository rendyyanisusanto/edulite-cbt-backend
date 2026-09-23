import express from 'express'
import * as z from 'zod'
import * as questionController from '../controllers/question.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'

const router = express.Router({ mergeParams: true })

router.use(authenticate)

const questionSchema = z.object({
  questionType: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'ESSAY']),
  content: z.string().min(1, 'Konten soal wajib diisi'),
  audioUri: z.string().nullable().optional(),
  correctAnswerEssay: z.string().nullable().optional(),
  options: z.array(z.object({
    content: z.string().min(1, 'Konten opsi wajib diisi'),
    isCorrect: z.boolean()
  })).optional()
}).refine(data => {
  if ((data.questionType === 'SINGLE_CHOICE' || data.questionType === 'MULTIPLE_CHOICE') && (!data.options || data.options.length < 2)) {
    return false
  }
  return true
}, {
  message: 'Soal pilihan ganda minimal harus memiliki 2 opsi',
  path: ['options']
}).refine(data => {
  if (data.questionType === 'SINGLE_CHOICE' && data.options) {
    const correctCount = data.options.filter(o => o.isCorrect).length
    return correctCount === 1
  }
  return true
}, {
  message: 'Soal pilihan ganda (tunggal) harus memiliki tepat 1 jawaban benar',
  path: ['options']
})

// Mounted at /api
router.get('/assignments/:assignmentId/questions', questionController.getQuestionsByAssignmentId)
router.post('/assignments/:assignmentId/questions', validate(questionSchema), questionController.createQuestion)

router.get('/questions/:id', questionController.getQuestionById)
router.put('/questions/:id', validate(questionSchema), questionController.updateQuestion)
router.delete('/questions/:id', questionController.deleteQuestion)

export default router
