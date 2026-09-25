import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { allowRoles } from '../middleware/role.middleware.js'
import * as monitorController from '../controllers/teacher-monitoring.controller.js'

const router = Router()

// All routes require TEACHER access
router.use(authenticate, allowRoles('GURU'))

router.get('/', monitorController.getMonitoringSchedules)
router.get('/:scheduleId', monitorController.getMonitoringDetail)
router.get('/:scheduleId/participants/:participantId', monitorController.getParticipantDetail)
router.post('/:scheduleId/participants/:participantId/reset-time', monitorController.resetParticipantTime)

export default router
