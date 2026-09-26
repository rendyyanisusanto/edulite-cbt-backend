import { Router } from 'express'
import { pool } from '../config/database.js'
import { response } from '../utils/response.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { allowRoles } from '../middleware/role.middleware.js'

const router = Router()

// Apply admin authentication to all routes in this file
router.use(authenticate, allowRoles('ADMIN'))

// GET /api/admin/schedules
router.get('/', async (req, res, next) => {
  try {
    const query = `
      SELECT 
        ces.id,
        ces.name,
        ces.start_at,
        ces.end_at,
        ces.duration_minutes,
        ces.late_tolerance_minutes,
        ces.token,
        ces.status,
        cea.id AS assignmentId,
        ce.id AS examId,
        ce.title AS examTitle,
        sub.name AS subjectName,
        c.name AS className,
        (SELECT COUNT(*) FROM cbt_exam_participants cep WHERE cep.schedule_id = ces.id) AS participantCount
      FROM cbt_exam_schedules ces
      JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
      JOIN cbt_exams ce ON cea.exam_id = ce.id
      JOIN subjects sub ON cea.subject_id = sub.id
      JOIN classes c ON cea.class_id = c.id
      ORDER BY ces.created_at DESC
    `
    const [rows] = await pool.query(query)
    
    return response.success(res, {
      data: { schedules: rows }
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/admin/schedules/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const query = `
      SELECT 
        ces.id,
        ces.exam_assignment_id AS assignmentId,
        ces.name,
        ces.start_at,
        ces.end_at,
        ces.duration_minutes,
        ces.late_tolerance_minutes,
        ces.token,
        ces.status,
        ce.title AS examTitle,
        sub.name AS subjectName,
        c.name AS className
      FROM cbt_exam_schedules ces
      JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
      JOIN cbt_exams ce ON cea.exam_id = ce.id
      JOIN subjects sub ON cea.subject_id = sub.id
      JOIN classes c ON cea.class_id = c.id
      WHERE ces.id = ?
    `
    const [rows] = await pool.query(query, [id])

    if (rows.length === 0) {
      return response.error(res, 'Jadwal tidak ditemukan', 404)
    }

    const schedule = rows[0]

    // Fetch participants
    const [participants] = await pool.query(`
      SELECT 
        cep.id AS participantId,
        cep.student_id AS studentId,
        s.full_name AS studentName,
        s.nis,
        c.name AS className,
        cep.participant_status,
        cep.is_eligible,
        cep.extra_time_minutes
      FROM cbt_exam_participants cep
      JOIN students s ON cep.student_id = s.id
      LEFT JOIN academic_years ay ON ay.is_active = 1
      LEFT JOIN student_class_history sch ON s.id = sch.student_id AND sch.academic_year_id = ay.id
      LEFT JOIN classes c ON sch.class_id = c.id
      WHERE cep.schedule_id = ?
    `, [id])

    return response.success(res, {
      data: {
        schedule,
        participants
      }
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/admin/schedules
router.post('/', async (req, res, next) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const {
      examAssignmentId,
      name,
      startAt,
      endAt,
      durationMinutes,
      lateToleranceMinutes,
      token,
      status
    } = req.body

    const userId = req.user.sub || req.user.id

    // 1. Validate Assignment and Readiness
    const [assignments] = await connection.query(`
      SELECT 
        cea.id, 
        cea.class_id, 
        cea.target_choice_questions, 
        cea.target_essay_questions,
        ce.status AS examStatus,
        (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = cea.id AND q.question_type = 'SINGLE_CHOICE') AS actual_choice,
        (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = cea.id AND q.question_type = 'ESSAY') AS actual_essay
      FROM cbt_exam_assignments cea
      JOIN cbt_exams ce ON cea.exam_id = ce.id
      WHERE cea.id = ?
    `, [examAssignmentId])

    if (assignments.length === 0) {
      throw new Error('Assignment tidak ditemukan')
    }

    const assignment = assignments[0]
    if (assignment.examStatus !== 'PUBLISHED' && assignment.examStatus !== 'READY') {
      throw new Error('Ujian belum dipublish')
    }

    if (assignment.actual_choice < assignment.target_choice_questions || assignment.actual_essay < assignment.target_essay_questions) {
      throw new Error('Assignment belum READY (soal belum mencukupi)')
    }

    // 2. Insert Schedule
    const [result] = await connection.query(`
      INSERT INTO cbt_exam_schedules (
        exam_assignment_id, name, start_at, end_at, duration_minutes, 
        late_tolerance_minutes, token, status, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      examAssignmentId, name || 'Reguler', startAt ? new Date(startAt) : null, endAt ? new Date(endAt) : null, durationMinutes,
      lateToleranceMinutes || 0, token, status || 'SCHEDULED', userId, userId
    ])

    const scheduleId = result.insertId

    // 3. Generate Participants based on class_id
    const classId = assignment.class_id
    const [students] = await connection.query(`
      SELECT s.id 
      FROM students s
      JOIN student_class_history sch ON s.id = sch.student_id
      JOIN academic_years ay ON sch.academic_year_id = ay.id
      WHERE sch.class_id = ? AND ay.is_active = 1
    `, [classId])

    let generatedCount = 0
    if (students.length > 0) {
      const values = students.map(s => [
        scheduleId, s.id, classId, 'REGISTERED', 'NOT_STARTED', 0, 1
      ])
      await connection.query(`
        INSERT IGNORE INTO cbt_exam_participants (
          schedule_id, student_id, class_id, attendance_status, 
          participant_status, extra_time_minutes, is_eligible
        ) VALUES ?
      `, [values])
      
      generatedCount = values.length
    }

    await connection.commit()

    return response.success(res, {
      message: 'Jadwal berhasil dibuat',
      data: {
        schedule: { id: scheduleId },
        participants: { generated: generatedCount, skipped: 0 }
      }
    })
  } catch (error) {
    await connection.rollback()
    // Extract specific error message if it's our own
    if (error.message && !error.message.includes('SQL')) {
      return response.error(res, error.message, 400)
    }
    console.error("Schedule Creation Error:", error)
    next(error)
  } finally {
    connection.release()
  }
})

// POST /api/admin/schedules/:id/sync-participants
router.post('/:id/sync-participants', async (req, res, next) => {
  try {
    const { id } = req.params

    const [schedules] = await pool.query(`
      SELECT ces.id, cea.class_id 
      FROM cbt_exam_schedules ces
      JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
      WHERE ces.id = ?
    `, [id])

    if (schedules.length === 0) {
      return response.error(res, 'Jadwal tidak ditemukan', 404)
    }

    const schedule = schedules[0]

    // Find active students in class
    const [students] = await pool.query(`
      SELECT s.id 
      FROM students s
      JOIN student_class_history sch ON s.id = sch.student_id
      JOIN academic_years ay ON sch.academic_year_id = ay.id
      WHERE sch.class_id = ? AND ay.is_active = 1
    `, [schedule.class_id])

    if (students.length === 0) {
      return response.success(res, {
        message: 'Tidak ada siswa aktif di kelas ini',
        data: { generated: 0 }
      })
    }

    const values = students.map(s => [
      schedule.id, s.id, schedule.class_id, 'REGISTERED', 'NOT_STARTED', 0, 1
    ])

    const [result] = await pool.query(`
      INSERT IGNORE INTO cbt_exam_participants (
        schedule_id, student_id, class_id, attendance_status, 
        participant_status, extra_time_minutes, is_eligible
      ) VALUES ?
    `, [values])

    return response.success(res, {
      message: 'Sinkronisasi berhasil',
      data: {
        generated: result.affectedRows,
        skipped: students.length - result.affectedRows
      }
    })

  } catch (error) {
    next(error)
  }
})

// PUT /api/admin/schedules/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      name, startAt, endAt, durationMinutes, 
      lateToleranceMinutes, token, status
    } = req.body
    
    const userId = req.user.sub || req.user.id

    const [result] = await pool.query(`
      UPDATE cbt_exam_schedules SET
        name = COALESCE(?, name),
        start_at = COALESCE(?, start_at),
        end_at = COALESCE(?, end_at),
        duration_minutes = COALESCE(?, duration_minutes),
        late_tolerance_minutes = COALESCE(?, late_tolerance_minutes),
        token = COALESCE(?, token),
        status = COALESCE(?, status),
        updated_by = ?
      WHERE id = ?
    `, [name, startAt ? new Date(startAt) : null, endAt ? new Date(endAt) : null, durationMinutes, lateToleranceMinutes, token, status, userId, id])

    if (result.affectedRows === 0) {
      return response.error(res, 'Jadwal tidak ditemukan', 404)
    }

    return response.success(res, { message: 'Jadwal berhasil diupdate' })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/admin/schedules/:id
router.delete('/:id', async (req, res, next) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    
    const { id } = req.params

    // Check attempts
    const [attempts] = await connection.query(`
      SELECT id FROM cbt_exam_participants 
      WHERE schedule_id = ? AND participant_status != 'NOT_STARTED'
      LIMIT 1
    `, [id])

    if (attempts.length > 0) {
      throw new Error('Jadwal tidak dapat dihapus karena sudah memiliki aktivitas ujian.')
    }

    // Safe to delete, cascade participants manually if DB doesn't have FK cascade (though it usually does)
    await connection.query('DELETE FROM cbt_exam_participants WHERE schedule_id = ?', [id])
    const [result] = await connection.query('DELETE FROM cbt_exam_schedules WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      throw new Error('Jadwal tidak ditemukan')
    }

    await connection.commit()
    return response.success(res, { message: 'Jadwal berhasil dihapus' })
  } catch (error) {
    await connection.rollback()
    if (error.message && !error.message.includes('SQL')) {
      return response.error(res, error.message, 409)
    }
    next(error)
  } finally {
    connection.release()
  }
})

// PUT /api/admin/schedules/:id/participants/:participantId/eligibility
router.put('/:id/participants/:participantId/eligibility', async (req, res, next) => {
  try {
    const { isEligible } = req.body
    await pool.query(
      'UPDATE cbt_exam_participants SET is_eligible = ? WHERE id = ?',
      [isEligible ? 1 : 0, req.params.participantId]
    )
    return response.success(res, { message: 'Eligibility diperbarui' })
  } catch (error) {
    next(error)
  }
})

export default router
