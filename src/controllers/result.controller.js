import { response } from '../utils/response.js'
import * as teacherRepo from '../repositories/teacher.repository.js'

export async function getResultsByAssignmentId(req, res, next) {
  try {
    const assignmentId = req.params.id
    
    // Validate ownership
    const assignment = await teacherRepo.getTeacherAssignmentById(req.user.sub, assignmentId)
    if (!assignment) {
      throw { status: 403, message: 'Akses ditolak' }
    }
    
    const query = `
      SELECT 
        stu.id AS studentId,
        stu.full_name AS studentName,
        att.id AS attemptId,
        att.status AS attemptStatus,
        att.correct_count,
        att.wrong_count,
        att.objective_points,
        att.essay_points,
        att.final_score,
        
        -- Essay stats
        (SELECT COUNT(*) FROM cbt_answers a JOIN cbt_exam_questions q ON a.exam_question_id = q.id WHERE a.attempt_id = att.id AND q.question_type = 'ESSAY') AS essay_total,
        (SELECT COUNT(*) FROM cbt_answers a JOIN cbt_exam_questions q ON a.exam_question_id = q.id WHERE a.attempt_id = att.id AND q.question_type = 'ESSAY' AND a.grading_status = 'MANUALLY_GRADED') AS essay_graded,
        (SELECT COUNT(*) FROM cbt_answers a JOIN cbt_exam_questions q ON a.exam_question_id = q.id WHERE a.attempt_id = att.id AND q.question_type = 'ESSAY' AND a.grading_status = 'PENDING') AS essay_pending
        
      FROM cbt_exam_schedules ces
      JOIN cbt_exam_participants cep ON ces.id = cep.schedule_id
      JOIN students stu ON cep.student_id = stu.id
      LEFT JOIN cbt_attempts att ON cep.id = att.participant_id
      WHERE ces.exam_assignment_id = ?
      ORDER BY stu.full_name ASC
    `;
    
    const { pool } = await import('../config/database.js');
    const [rows] = await pool.query(query, [assignmentId]);

    const dataMap = new Map();
    rows.forEach(row => {
      let gradingStatus = 'NOT_STARTED';
      if (row.attemptStatus) {
        if (row.essay_pending > 0) gradingStatus = 'WAITING_ESSAY_GRADING';
        else gradingStatus = 'GRADED';
      }

      // If student already exists, keep the one with a higher finalScore or the one that is further progressed
      if (dataMap.has(row.studentId)) {
        const existing = dataMap.get(row.studentId);
        // Prioritize SUBMITTED over IN_PROGRESS over NOT_STARTED
        const priority = { 'SUBMITTED': 3, 'TIME_EXPIRED': 3, 'IN_PROGRESS': 2, 'NOT_STARTED': 1 };
        const currPrio = priority[row.attemptStatus || 'NOT_STARTED'] || 0;
        const exPrio = priority[existing.attemptStatus] || 0;
        if (exPrio > currPrio) return;
        if (exPrio === currPrio && (existing.finalScore || 0) >= (row.final_score || 0)) return;
      }

      dataMap.set(row.studentId, {
        studentId: row.studentId,
        studentName: row.studentName,
        attemptStatus: row.attemptStatus || 'NOT_STARTED',
        attemptId: row.attemptId,
        objective: {
          correct: row.correct_count || 0,
          wrong: row.wrong_count || 0,
          points: row.objective_points || 0
        },
        essay: {
          total: row.essay_total || 0,
          graded: row.essay_graded || 0,
          pending: row.essay_pending || 0
        },
        finalScore: row.final_score,
        gradingStatus
      });
    });

    const data = Array.from(dataMap.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));

    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}

export async function getStudentResultDetail(req, res, next) {
  try {
    const assignmentId = req.params.id;
    const studentId = req.params.studentId;

    // Validate ownership
    const assignment = await teacherRepo.getTeacherAssignmentById(req.user.sub, assignmentId);
    if (!assignment) {
      throw { status: 403, message: 'Akses ditolak' };
    }

    const { pool } = await import('../config/database.js');

    const [attempts] = await pool.query(`
      SELECT 
        stu.id AS studentId,
        stu.full_name AS studentName,
        c.name AS className,
        att.id AS attemptId,
        att.status AS attemptStatus,
        att.correct_count,
        att.wrong_count,
        att.objective_points,
        att.essay_points,
        att.final_score
      FROM cbt_exam_schedules ces
      JOIN cbt_exam_participants cep ON ces.id = cep.schedule_id
      JOIN students stu ON cep.student_id = stu.id
      LEFT JOIN academic_years ay ON ay.is_active = 1
      LEFT JOIN student_class_history sch ON stu.id = sch.student_id AND sch.academic_year_id = ay.id
      LEFT JOIN classes c ON sch.class_id = c.id
      LEFT JOIN cbt_attempts att ON cep.id = att.participant_id
      WHERE ces.exam_assignment_id = ? AND stu.id = ?
      ORDER BY att.id DESC
      LIMIT 1
    `, [assignmentId, studentId]);

    if (attempts.length === 0) {
      throw { status: 404, message: 'Hasil siswa tidak ditemukan' };
    }

    const attemptInfo = attempts[0];
    
    if (!attemptInfo.attemptId) {
      return response.success(res, { data: {
        studentId: attemptInfo.studentId,
        studentName: attemptInfo.studentName,
        className: attemptInfo.className,
        score: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        answers: []
      }});
    }

    // Get Detailed Answers
    const [answers] = await pool.query(`
      SELECT 
        a.id AS answerId,
        a.exam_question_id AS questionId,
        q.question_type AS type,
        q.score AS maxScore,
        a.is_correct AS isCorrect,
        a.answer_text AS essayText,
        a.score_awarded AS scoreAwarded,
        a.grading_status AS gradingStatus,
        o.option_key AS choiceKey
      FROM cbt_answers a
      JOIN cbt_exam_questions q ON a.exam_question_id = q.id
      LEFT JOIN cbt_answer_choices ac ON a.id = ac.answer_id
      LEFT JOIN cbt_exam_question_options o ON ac.exam_question_option_id = o.id
      WHERE a.attempt_id = ?
    `, [attemptInfo.attemptId]);

    const formattedAnswers = answers.map(ans => ({
      answerId: ans.answerId,
      questionId: ans.questionId,
      studentAnswer: ans.type === 'SINGLE_CHOICE' ? ans.choiceKey : ans.essayText,
      isCorrect: ans.isCorrect === 1,
      gradingStatus: ans.gradingStatus,
      scoreAwarded: ans.scoreAwarded,
      maxScore: ans.maxScore
    }));

    response.success(res, {
      data: {
        studentId: attemptInfo.studentId,
        studentName: attemptInfo.studentName,
        className: attemptInfo.className,
        score: attemptInfo.final_score || 0,
        correct: attemptInfo.correct_count || 0,
        wrong: attemptInfo.wrong_count || 0,
        answers: formattedAnswers
      }
    });

  } catch(err) {
    next(err);
  }
}

