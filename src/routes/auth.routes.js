import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { loginSchema } from '../schemas/auth.schema.js'

const router = Router()

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login)

// GET /api/auth/me
router.get('/me', authenticate, authController.me)

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout)

export default router
