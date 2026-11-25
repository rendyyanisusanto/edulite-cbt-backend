import express from 'express'
import * as z from 'zod'
import * as assignmentController from '../controllers/assignment.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { allowRoles } from '../middleware/role.middleware.js'
import { validate } from '../middleware/validate.middleware.js'

const router = express.Router({ mergeParams: true })

router.use(authenticate)

const assignmentSchema = z.object({
  teacherId: z.number({ required_error: 'Guru wajib dipilih' }),
  subjectId: z.number({ required_error: 'Mata pelajaran wajib dipilih' }),
  classId: z.number({ required_error: 'Kelas wajib dipilih' }),
  targetChoiceQuestions: z.number({ required_error: 'Target soal PG wajib diisi' }).min(0, 'Minimal 0'),
  targetEssayQuestions: z.number({ required_error: 'Target soal Essay wajib diisi' }).min(0, 'Minimal 0')
}).refine(data => data.targetChoiceQuestions + data.targetEssayQuestions > 0, {
  message: 'Total target soal harus lebih dari 0',
  path: ['targetChoiceQuestions']
})

const bulkAssignmentSchema = z.object({
  teacherId: z.number({ required_error: 'Guru wajib dipilih' }),
  subjectIds: z.array(z.number()).min(1, 'Minimal pilih 1 mata pelajaran'),
  classIds: z.array(z.number()).min(1, 'Minimal pilih 1 kelas'),
  targetChoiceQuestions: z.number({ required_error: 'Target soal PG wajib diisi' }).min(0, 'Minimal 0'),
  targetEssayQuestions: z.number({ required_error: 'Target soal Essay wajib diisi' }).min(0, 'Minimal 0')
}).refine(data => data.targetChoiceQuestions + data.targetEssayQuestions > 0, {
  message: 'Total target soal harus lebih dari 0',
  path: ['targetChoiceQuestions']
})

// These paths are mounted at /api
router.get('/assignments', allowRoles('ADMIN'), assignmentController.getAllAssignments)
router.put('/assignments/:id', allowRoles('ADMIN'), validate(assignmentSchema), assignmentController.updateAssignment)
router.delete('/assignments/:id', allowRoles('ADMIN'), assignmentController.deleteAssignment)

// These paths are mounted at /api/exams/:examId/assignments
router.get('/exams/:examId/assignments', allowRoles('ADMIN'), assignmentController.getAssignmentsByExamId)
router.post('/exams/:examId/assignments', allowRoles('ADMIN'), validate(assignmentSchema), assignmentController.createAssignment)
router.post('/exams/:examId/assignments/bulk', allowRoles('ADMIN'), validate(bulkAssignmentSchema), assignmentController.createBulkAssignments)

export default router
