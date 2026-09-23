import { Router } from 'express'
import { response } from '../utils/response.js'
import { pool } from '../config/database.js'
import authRoutes from './auth.routes.js'

const router = Router()

// Health check
router.get('/health', async (req, res) => {
  let dbStatus = 'disconnected'
  try {
    const conn = await pool.getConnection()
    await conn.query('SELECT 1')
    conn.release()
    dbStatus = 'connected'
  } catch {
    dbStatus = 'disconnected'
  }

  return response.success(res, {
    message: 'CBT Edulite API is running',
    data: { database: dbStatus },
  })
})

// Auth routes
router.use('/auth', authRoutes)

export default router
