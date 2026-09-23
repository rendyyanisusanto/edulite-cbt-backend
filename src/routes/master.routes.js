import express from 'express'
import * as masterController from '../controllers/master.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = express.Router()

// All master routes require authentication
router.use(authenticate)

router.get('/academic-years', masterController.getAcademicYears)
router.get('/teachers', masterController.getTeachers)
router.get('/classes', masterController.getClasses)
router.get('/subjects', masterController.getSubjects)

export default router
