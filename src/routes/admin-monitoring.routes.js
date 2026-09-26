import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { allowRoles } from '../middleware/role.middleware.js'
import * as monitorController from '../controllers/admin-monitoring.controller.js'

const router = Router()

// All routes require ADMIN access
router.use(authenticate, allowRoles('ADMIN'))

router.get('/', monitorController.getMonitoringSchedules)
router.get('/:scheduleId', monitorController.getMonitoringDetail)
router.get('/:scheduleId/participants/:participantId', monitorController.getParticipantDetail)
router.post('/:scheduleId/participants/:participantId/reset-time', monitorController.resetParticipantTime)
router.post('/:scheduleId/participants/:participantId/toggle-pause', monitorController.toggleParticipantPause)

export default router
