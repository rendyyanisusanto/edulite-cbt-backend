import { Router } from 'express'
import { pool } from '../config/database.js'
import { response } from '../utils/response.js'
import { requireStudent } from '../middleware/student.middleware.js'
import crypto from 'crypto'

const router = Router()

const formatISO = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toISOString();
}

// GET /api/student/exams
router.get('/', requireStudent, async (req, res, next) => {
  try {
    const studentId = req.student.studentId

    const [studentRows] = await pool.query(`
      SELECT s.id, s.full_name AS name, s.nis, c.id AS classId, c.name AS className 
      FROM students s
      LEFT JOIN academic_years ay ON ay.is_active = 1
      LEFT JOIN student_class_history sch ON s.id = sch.student_id AND sch.academic_year_id = ay.id
      LEFT JOIN classes c ON sch.class_id = c.id
      WHERE s.id = ?
    `, [studentId])
    const studentData = studentRows[0] || { id: studentId }

    const query = `
      SELECT 
        cep.id AS participantId,
        cep.participant_status,
        cep.is_eligible,
        
        ces.id AS scheduleId,
        ces.start_at,
        ces.end_at,
        ces.duration_minutes AS scheduleDuration,
        ces.status AS scheduleStatus,
        
        cea.id AS assignmentId,
        cea.target_choice_questions,
        cea.target_essay_questions,
        
        ce.id AS examId,
        ce.title AS examTitle,
        ce.duration_minutes AS examDuration,
        ce.code AS examCode,
        ce.exam_type AS examType,
        
        sub.id AS subjectId,
        sub.name AS subjectName,
        
        c.id AS classId,
        c.name AS className,

        (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = cea.id AND q.question_type = 'SINGLE_CHOICE') AS actual_choice,
        (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = cea.id AND q.question_type = 'ESSAY') AS actual_essay
        
      FROM cbt_exam_participants cep
      JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
      JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
      JOIN cbt_exams ce ON cea.exam_id = ce.id
      JOIN subjects sub ON cea.subject_id = sub.id
      JOIN classes c ON cea.class_id = c.id
      
      WHERE cep.student_id = ? 
        AND cep.is_eligible = 1
        AND ce.status IN ('READY', 'PUBLISHED', 'FINISHED')
    `
    const [rows] = await pool.query(query, [studentId])

    const now = new Date()

    const exams = rows.map(row => {
      const actualChoice = row.actual_choice || 0
      const actualEssay = row.actual_essay || 0
      
      if (actualChoice < row.target_choice_questions || actualEssay < row.target_essay_questions) {
        return null // Assignment not ready
      }

      let status = 'AVAILABLE'
      const startAt = new Date(row.start_at)
      const endAt = new Date(row.end_at)

      if (row.participant_status === 'BLOCKED') {
        status = 'BLOCKED'
      } else if (row.participant_status === 'FINISHED') {
        status = 'COMPLETED'
      } else if (row.participant_status === 'IN_PROGRESS') {
        status = 'IN_PROGRESS'
      } else {
        if (now < startAt) {
          status = 'UPCOMING'
        } else if (now > endAt) {
          status = 'EXPIRED'
        } else {
          if (row.scheduleStatus === 'CLOSED' || row.scheduleStatus === 'CANCELLED') {
             status = 'EXPIRED' 
          } else {
             status = 'AVAILABLE'
          }
        }
      }

      return {
        participantId: row.participantId,
        scheduleId: row.scheduleId,
        exam: {
          id: row.examId,
          title: row.examTitle,
          code: row.examCode,
          examType: row.examType
        },
        subject: {
          id: row.subjectId,
          name: row.subjectName
        },
        class: {
          id: row.classId,
          name: row.className
        },
        schedule: {
          startAt: formatISO(row.start_at),
          endAt: formatISO(row.end_at)
        },
        durationMinutes: row.scheduleDuration || row.examDuration,
        questionSummary: {
          choice: actualChoice,
          essay: actualEssay,
          total: actualChoice + actualEssay
        },
        status,
        attempt: status === 'IN_PROGRESS' ? { status: 'IN_PROGRESS' } : null
      }
    }).filter(Boolean)

    return response.success(res, {
      data: {
        serverTime: formatISO(now),
        student: {
          id: studentData.id,
          name: studentData.name,
          class: {
            id: studentData.classId,
            name: studentData.className
          }
        },
        items: exams
      }
    })

  } catch (error) {
    next(error)
  }
})

// GET /api/student/exams/:scheduleId
router.get('/:scheduleId', requireStudent, async (req, res, next) => {
  try {
    const studentId = req.student.studentId
    const { scheduleId } = req.params

    const query = `
      SELECT 
        cep.id AS participantId,
        cep.participant_status,
        cep.is_eligible,
        
        ces.id AS scheduleId,
        ces.start_at,
        ces.end_at,
        ces.duration_minutes AS scheduleDuration,
        ces.status AS scheduleStatus,
        
        cea.id AS assignmentId,
        
        ce.id AS examId,
        ce.title AS examTitle,
        ce.instructions AS examInstructions,
        ce.duration_minutes AS examDuration,
        ce.exam_type AS examType,
        
        sub.id AS subjectId,
        sub.name AS subjectName,
        
        c.id AS classId,
        c.name AS className,

        s.id AS studentId,
        s.full_name AS studentName,
        s.nis AS studentNis,

        (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = cea.id AND q.question_type = 'SINGLE_CHOICE') AS actual_choice,
        (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = cea.id AND q.question_type = 'ESSAY') AS actual_essay
        
      FROM cbt_exam_participants cep
      JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
      JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
      JOIN cbt_exams ce ON cea.exam_id = ce.id
      JOIN subjects sub ON cea.subject_id = sub.id
      JOIN students s ON cep.student_id = s.id
      LEFT JOIN academic_years ay ON ay.is_active = 1
      LEFT JOIN student_class_history sch ON s.id = sch.student_id AND sch.academic_year_id = ay.id
      LEFT JOIN classes c ON sch.class_id = c.id
      
      WHERE cep.student_id = ? 
        AND ces.id = ?
    `
    const [rows] = await pool.query(query, [studentId, scheduleId])

    if (rows.length === 0) {
      return response.error(res, 'Ujian tidak ditemukan atau Anda tidak terdaftar pada ujian ini.', 404)
    }

    const row = rows[0]
    
    const now = new Date()
    let status = 'AVAILABLE'
    const startAt = new Date(row.start_at)
    const endAt = new Date(row.end_at)

    if (!row.is_eligible || row.participant_status === 'BLOCKED') {
      status = 'BLOCKED'
    } else if (row.participant_status === 'FINISHED') {
      status = 'COMPLETED'
    } else if (row.participant_status === 'IN_PROGRESS') {
      status = 'IN_PROGRESS'
    } else {
      if (now < startAt) {
        status = 'UPCOMING'
      } else if (now > endAt) {
        status = 'EXPIRED'
      } else {
        if (row.scheduleStatus === 'CLOSED' || row.scheduleStatus === 'CANCELLED') {
           status = 'EXPIRED' 
        } else {
           status = 'AVAILABLE'
        }
      }
    }

    const actualChoice = row.actual_choice || 0
    const actualEssay = row.actual_essay || 0

    return response.success(res, {
      data: {
        serverTime: formatISO(now),
        participant: {
          id: row.participantId,
          isEligible: row.is_eligible === 1,
          status: row.participant_status
        },
        student: {
          id: row.studentId,
          name: row.studentName,
          nis: row.studentNis,
          className: row.className
        },
        exam: {
          id: row.examId,
          title: row.examTitle,
          examType: row.examType,
          instructions: row.examInstructions
        },
        subject: {
          id: row.subjectId,
          name: row.subjectName
        },
        class: {
          id: row.classId,
          name: row.className
        },
        schedule: {
          startAt: formatISO(row.start_at),
          endAt: formatISO(row.end_at),
          durationMinutes: row.scheduleDuration || row.examDuration
        },
        questionSummary: {
          choice: actualChoice,
          essay: actualEssay,
          total: actualChoice + actualEssay
        },
        status,
        access: {
          requiresToken: true
        },
        attempt: status === 'IN_PROGRESS' ? { status: 'IN_PROGRESS' } : null
      }
    })

  } catch (error) {
    next(error)
  }
})

// POST /api/student/exams/:scheduleId/verify-token
router.post('/:scheduleId/verify-token', requireStudent, async (req, res, next) => {
  try {
    const studentId = req.student.studentId
    const { scheduleId } = req.params
    const { token } = req.body

    const query = `
      SELECT 
        cep.is_eligible,
        cep.participant_status,
        ces.start_at,
        ces.end_at,
        ces.status AS scheduleStatus,
        ces.token
      FROM cbt_exam_participants cep
      JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
      WHERE cep.student_id = ? AND ces.id = ?
    `
    const [rows] = await pool.query(query, [studentId, scheduleId])

    if (rows.length === 0) {
      return response.error(res, 'Ujian tidak ditemukan.', 404)
    }

    const row = rows[0]
    
    if (!row.is_eligible || row.participant_status === 'BLOCKED') {
      return response.error(res, 'Akses Ujian Dibatasi', 403)
    }

    const now = new Date()
    const startAt = new Date(row.start_at)
    const endAt = new Date(row.end_at)

    if (now < startAt) {
      return response.error(res, 'Ujian belum dibuka.', 409)
    }
    
    if (now > endAt || row.scheduleStatus === 'CLOSED' || row.scheduleStatus === 'CANCELLED') {
      return response.error(res, 'Waktu akses ujian telah berakhir.', 403)
    }

    if (row.participant_status === 'FINISHED') {
      return response.error(res, 'Ujian telah selesai dikerjakan.', 403)
    }

    const dbToken = (row.token || '').trim().toUpperCase()
    const inputToken = (token || '').trim().toUpperCase()

    if (dbToken !== inputToken) {
      return response.error(res, 'Token ujian tidak sesuai.', 403)
    }

    return response.success(res, {
      message: 'Token valid.',
      data: {
        verified: true
      }
    })
    
  } catch (error) {
    next(error)
  }
})

// POST /api/student/exams/:scheduleId/start
router.post('/:scheduleId/start', requireStudent, async (req, res, next) => {
  let connection;
  try {
    const studentId = req.student.studentId;
    const { scheduleId } = req.params;
    const { token } = req.body;

    const query = `
      SELECT 
        cep.id AS participantId,
        cep.participant_status,
        cep.is_eligible,
        cep.extra_time_minutes,
        
        ces.id AS scheduleId,
        ces.start_at,
        ces.end_at,
        ces.status AS scheduleStatus,
        ces.token,
        ces.duration_minutes AS scheduleDuration,
        
        cea.id AS assignmentId,
        cea.max_attempts,
        
        ce.status AS examStatus,
        ce.duration_minutes AS examDuration
      FROM cbt_exam_participants cep
      JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
      JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
      JOIN cbt_exams ce ON cea.exam_id = ce.id
      WHERE cep.student_id = ? AND ces.id = ?
    `;
    const [rows] = await pool.query(query, [studentId, scheduleId]);

    if (rows.length === 0) {
      return response.error(res, 'Ujian tidak ditemukan.', 404);
    }
    const row = rows[0];

    if (!row.is_eligible || row.participant_status === 'BLOCKED') {
      return response.error(res, 'Anda tidak dapat mengikuti ujian ini. Silakan hubungi pengawas.', 403);
    }

    if (row.scheduleStatus === 'CANCELLED' || row.scheduleStatus === 'CLOSED') {
      return response.error(res, 'Akses Ujian Dibatasi', 403);
    }
    if (row.examStatus !== 'READY' && row.examStatus !== 'PUBLISHED') {
      return response.error(res, 'Ujian belum tersedia.', 403);
    }

    const now = new Date();
    const startAt = new Date(row.start_at);
    const endAt = new Date(row.end_at);

    if (now < startAt) {
      return response.error(res, 'Ujian belum dibuka.', 409);
    }
    if (now > endAt) {
      return response.error(res, 'Waktu akses ujian telah berakhir.', 403);
    }
    if (row.participant_status === 'FINISHED') {
      return response.error(res, 'Ujian telah selesai dikerjakan.', 403);
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingAttempts] = await connection.query(
      `SELECT id, status, started_at, expires_at FROM cbt_attempts WHERE participant_id = ? AND status = 'IN_PROGRESS' LIMIT 1 FOR UPDATE`,
      [row.participantId]
    );

    if (existingAttempts.length > 0) {
      await connection.commit();
      connection.release();
      return response.success(res, {
        message: 'Melanjutkan ujian.',
        data: {
          mode: 'RESUME',
          attemptId: existingAttempts[0].id,
          status: existingAttempts[0].status,
          startedAt: formatISO(existingAttempts[0].started_at),
          expiresAt: formatISO(existingAttempts[0].expires_at)
        }
      });
    }

    // New Attempt: Check Token
    const dbToken = (row.token || '').trim().toUpperCase();
    const inputToken = (token || '').trim().toUpperCase();
    if (dbToken && dbToken !== inputToken) {
      await connection.rollback();
      connection.release();
      return response.error(res, 'Token ujian tidak sesuai.', 403);
    }

    const [totalAttemptsRow] = await connection.query(
      `SELECT COUNT(*) as count FROM cbt_attempts WHERE participant_id = ?`,
      [row.participantId]
    );
    const totalAttempts = totalAttemptsRow[0].count;
    if (totalAttempts >= row.max_attempts) {
      await connection.rollback();
      connection.release();
      return response.error(res, 'Anda sudah mencapai batas maksimal percobaan ujian.', 403);
    }

    const attemptNumber = totalAttempts + 1;
    const randomizationSeed = crypto.randomUUID();
    
    const startedAt = new Date();
    const baseDuration = row.scheduleDuration || row.examDuration;
    const totalMinutes = baseDuration + (row.extra_time_minutes || 0);
    
    const candidateExpiresAt = new Date(startedAt.getTime() + totalMinutes * 60000);
    const expiresAt = candidateExpiresAt > endAt ? endAt : candidateExpiresAt;

    const [attemptResult] = await connection.query(
      `INSERT INTO cbt_attempts 
        (participant_id, attempt_number, randomization_seed, started_at, expires_at, last_activity_at, status, ip_address, user_agent, version)
       VALUES (?, ?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, 1)`,
      [row.participantId, attemptNumber, randomizationSeed, startedAt, expiresAt, startedAt, req.ip, req.headers['user-agent'] || '']
    );
    const attemptId = attemptResult.insertId;

    await connection.query(
      `UPDATE cbt_exam_participants SET participant_status = 'IN_PROGRESS', attendance_status = 'PRESENT' WHERE id = ?`,
      [row.participantId]
    );

    await connection.query(
      `INSERT INTO cbt_activity_logs (attempt_id, user_id, event_type, description, metadata, ip_address)
       VALUES (?, ?, 'EXAM_STARTED', 'Student started exam attempt', ?, ?)`,
      [attemptId, null, JSON.stringify({ attemptNumber }), req.ip]
    );

    await connection.commit();
    connection.release();

    return response.success(res, {
      message: 'Ujian dimulai.',
      data: {
        mode: 'START',
        attemptId: attemptId,
        status: 'IN_PROGRESS',
        startedAt: formatISO(startedAt),
        expiresAt: formatISO(expiresAt)
      }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    next(error);
  }
})

export default router
