import express from 'express'
import * as controller from '../controllers/student-account.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { allowRoles } from '../middleware/role.middleware.js'

const router = express.Router()

// All routes require ADMIN role
router.use(authenticate, allowRoles('ADMIN'))

router.get('/', controller.getStudentAccounts)
router.post('/generate', controller.generateAccounts)
router.post('/:studentId/reset-password', controller.resetPassword)
router.patch('/:studentId/status', controller.updateStatus)

export default router
