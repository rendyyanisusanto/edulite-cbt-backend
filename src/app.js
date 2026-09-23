import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import masterRoutes from './routes/master.routes.js'
import examRoutes from './routes/exam.routes.js'
import assignmentRoutes from './routes/assignment.routes.js'
import teacherRoutes from './routes/teacher.routes.js'
import questionRoutes from './routes/question.routes.js'
import studentAccountRoutes from './routes/student-account.routes.js'
import studentAuthRoutes from './routes/student-auth.routes.js'
import studentExamRoutes from './routes/student-exam.routes.js'
import studentAttemptRoutes from './routes/student-attempt.routes.js'
import scheduleRoutes from './routes/schedule.routes.js'
import adminMonitoringRoutes from './routes/admin-monitoring.routes.js'
import teacherMonitoringRoutes from './routes/teacher-monitoring.routes.js'
import { errorHandler } from './middleware/error.middleware.js'
import { response } from './utils/response.js'

const app = express()

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet())

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [env.frontendUrl, 'http://localhost:5175', 'http://127.0.0.1:5175'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// ─── Body Parser ─────────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/student/auth', studentAuthRoutes)
app.use('/api/student/exams', studentExamRoutes)
app.use('/api/student/attempts', studentAttemptRoutes)
app.use('/api/master', masterRoutes)
app.use('/api/exams', examRoutes)
app.use('/api', assignmentRoutes)
app.use('/api/teacher', teacherRoutes)
app.use('/api', questionRoutes)
app.use('/api/admin/student-accounts', studentAccountRoutes)
app.use('/api/admin/schedules', scheduleRoutes)
app.use('/api/admin/monitoring', adminMonitoringRoutes)
app.use('/api/teacher/monitoring', teacherMonitoringRoutes)

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  response.success(res, { message: 'Server is healthy', data: { time: new Date() } })
})

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  return response.error(res, {
    statusCode: 404,
    message: 'Endpoint tidak ditemukan.',
  })
})

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler)

export default app
