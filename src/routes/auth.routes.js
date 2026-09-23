import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as authController from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { loginSchema } from '../schemas/auth.schema.js'

const router = Router()

// Rate limiting for login: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Silakan coba kembali beberapa saat lagi.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/auth/login
router.post('/login', loginLimiter, validate(loginSchema), authController.login)

// GET /api/auth/me
router.get('/me', authenticate, authController.me)

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout)

export default router
