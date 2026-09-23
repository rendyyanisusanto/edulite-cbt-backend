import express from 'express'
import * as z from 'zod'
import * as examController from '../controllers/exam.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { allowRoles } from '../middleware/role.middleware.js'
import { validate } from '../middleware/validate.middleware.js'

const router = express.Router()

// All exam routes require ADMIN role
router.use(authenticate, allowRoles('ADMIN'))

const examSchema = z.object({
  title: z.string().min(1, 'Judul ujian wajib diisi'),
  code: z.string().min(1, 'Kode ujian wajib diisi'),
  academicYearId: z.number({ required_error: 'Tahun ajaran wajib dipilih' }),
  semester: z.string().min(1, 'Semester wajib dipilih'),
  examType: z.string().min(1, 'Jenis ujian wajib dipilih'),
  description: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'READY', 'PUBLISHED', 'FINISHED', 'CANCELLED']).optional()
})

router.get('/', examController.getAllExams)
router.get('/:id', examController.getExamById)
router.post('/', validate(examSchema), examController.createExam)
router.put('/:id', validate(examSchema), examController.updateExam)
router.delete('/:id', examController.deleteExam)

export default router
