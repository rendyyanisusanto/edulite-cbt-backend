import express from 'express'
import * as teacherController from '../controllers/teacher.controller.js'
import * as questionController from '../controllers/question.controller.js'
import * as resultController from '../controllers/result.controller.js'
import * as gradingController from '../controllers/teacher-grading.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { allowRoles } from '../middleware/role.middleware.js'

const router = express.Router()

router.use(authenticate, allowRoles('GURU'))

router.get('/assignments', teacherController.getTeacherAssignments)
router.get('/assignments/:id', teacherController.getTeacherAssignmentById)

router.get('/assignments/:assignmentId/questions', questionController.getQuestionsByAssignmentId)
router.post('/assignments/:assignmentId/questions', questionController.createQuestion)
router.post('/assignments/:assignmentId/clone-questions', questionController.cloneQuestions)
router.get('/questions/:id', questionController.getQuestionById)
router.put('/questions/:id', questionController.updateQuestion)
router.delete('/questions/:id', questionController.deleteQuestion)
router.post('/questions/:id/duplicate', questionController.duplicateQuestion)

router.get('/assignments/:id/results', resultController.getResultsByAssignmentId)
router.get('/assignments/:id/results/:studentId', resultController.getStudentResultDetail)

router.get('/assignments/:assignmentId/essay-pending', gradingController.getEssayPending)
router.put('/answers/:answerId/grade', gradingController.gradeEssay)

export default router
