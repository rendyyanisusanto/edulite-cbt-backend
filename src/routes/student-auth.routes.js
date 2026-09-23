import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../config/database.js'
import { env } from '../config/env.js'
import { response } from '../utils/response.js'
import { requireStudent } from '../middleware/student.middleware.js'

const router = Router()

// POST /api/student/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { login, password, username } = req.body
    const identifier = login || username

    if (!identifier || !password) {
      return response.error(res, {
        statusCode: 400,
        message: 'Username dan password wajib diisi.',
      })
    }

    // Lookup student account
    const [rows] = await pool.query(
      `SELECT 
        csa.id AS accountId,
        csa.password_hash,
        csa.is_active,
        s.id AS studentId,
        s.full_name AS studentName,
        csa.username,
        c.id AS classId,
        c.name AS className
       FROM cbt_student_accounts csa
       JOIN students s ON csa.student_id = s.id
       LEFT JOIN academic_years ay ON ay.is_active = 1
       LEFT JOIN student_class_history sch ON s.id = sch.student_id AND sch.academic_year_id = ay.id
       LEFT JOIN classes c ON sch.class_id = c.id
       WHERE csa.username = ?`,
      [identifier]
    )

    const account = rows[0]

    if (!account) {
      return response.error(res, {
        statusCode: 401,
        message: 'Username atau password tidak sesuai.',
      })
    }

    if (!account.is_active) {
      return response.error(res, {
        statusCode: 403,
        message: 'Akun CBT Anda tidak aktif. Silakan hubungi pengawas.',
      })
    }

    const isMatch = await bcrypt.compare(password, account.password_hash)
    if (!isMatch) {
      return response.error(res, {
        statusCode: 401,
        message: 'Username atau password tidak sesuai.',
      })
    }

    // Update last_login
    await pool.query(
      'UPDATE cbt_student_accounts SET last_login = NOW() WHERE id = ?',
      [account.accountId]
    )

    // Generate JWT
    const payload = {
      sub: account.accountId,
      type: 'STUDENT',
      studentId: account.studentId,
    }

    const accessToken = jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn || '24h',
    })

    return response.success(res, {
      message: 'Login berhasil.',
      data: {
        accessToken,
        student: {
          id: account.studentId,
          name: account.studentName,
          username: account.username,
          class: {
            id: account.classId,
            name: account.className,
          },
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/student/auth/me
router.get('/me', requireStudent, async (req, res, next) => {
  try {
    const studentId = req.student.studentId
    const accountId = req.student.sub

    const [rows] = await pool.query(
      `SELECT 
        s.id AS studentId,
        s.full_name AS studentName,
        csa.username,
        c.id AS classId,
        c.name AS className
       FROM cbt_student_accounts csa
       JOIN students s ON csa.student_id = s.id
       LEFT JOIN academic_years ay ON ay.is_active = 1
       LEFT JOIN student_class_history sch ON s.id = sch.student_id AND sch.academic_year_id = ay.id
       LEFT JOIN classes c ON sch.class_id = c.id
       WHERE csa.id = ? AND csa.is_active = 1`,
      [accountId]
    )

    const account = rows[0]

    if (!account) {
      return response.error(res, {
        statusCode: 401,
        message: 'Akun tidak ditemukan atau tidak aktif.',
      })
    }

    return response.success(res, {
      data: {
        student: {
          id: account.studentId,
          name: account.studentName,
          username: account.username,
          class: {
            id: account.classId,
            name: account.className,
          },
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/student/auth/logout
router.post('/logout', requireStudent, (req, res) => {
  // Stateless JWT doesn't need server-side invalidation unless using blacklists.
  return response.success(res, { message: 'Logout berhasil.' })
})

export default router
