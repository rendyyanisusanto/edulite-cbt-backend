import { response } from '../utils/response.js'
import { pool } from '../config/database.js'
import { recalculateAttemptScore } from '../services/grading.service.js'

export async function getEssayPending(req, res, next) {
  try {
    const assignmentId = req.params.assignmentId
    const teacherId = req.user.teacherId

    if (!teacherId) {
      throw { status: 403, message: 'Akses ditolak (Bukan Guru)' }
    }

    // Verify ownership
    const [assignments] = await pool.query(`SELECT id FROM cbt_exam_assignments WHERE id = ? AND teacher_id = ?`, [assignmentId, teacherId])
    if (assignments.length === 0) {
      throw { status: 403, message: 'Akses ditolak' }
    }

    const query = `
      SELECT 
        ans.id AS answerId,
        ans.attempt_id,
        ans.answer_text,
        ans.score_awarded,
        q.question_text,
        q.score AS max_score,
        stu.full_name AS studentName,
        stu.nisn
      FROM cbt_answers ans
      JOIN cbt_exam_questions q ON ans.exam_question_id = q.id
      JOIN cbt_attempts att ON ans.attempt_id = att.id
      JOIN cbt_exam_participants cep ON att.participant_id = cep.id
      JOIN students stu ON cep.student_id = stu.id
      JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
      WHERE ces.exam_assignment_id = ? 
        AND q.question_type = 'ESSAY'
        AND ans.grading_status = 'PENDING'
      ORDER BY stu.full_name ASC, q.id ASC
    `;
    
    const [rows] = await pool.query(query, [assignmentId]);

    return response.success(res, { data: rows });
  } catch (err) {
    next(err)
  }
}

export async function gradeEssay(req, res, next) {
  let connection;
  try {
    const { answerId } = req.params;
    const { score, feedback } = req.body;
    const userId = req.user.sub;
    const teacherId = req.user.teacherId;

    if (!teacherId) {
      throw { status: 403, message: 'Akses ditolak (Bukan Guru)' }
    }

    if (score === undefined || score < 0) {
      return response.error(res, 'Nilai tidak valid.', 400);
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verify ownership and get max score
    const [answers] = await connection.query(`
      SELECT 
        ans.id,
        ans.attempt_id,
        q.score AS max_score,
        cea.teacher_id
      FROM cbt_answers ans
      JOIN cbt_exam_questions q ON ans.exam_question_id = q.id
      JOIN cbt_attempts att ON ans.attempt_id = att.id
      JOIN cbt_exam_participants cep ON att.participant_id = cep.id
      JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
      JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
      WHERE ans.id = ? AND q.question_type = 'ESSAY' FOR UPDATE
    `, [answerId]);

    if (answers.length === 0) {
      throw { status: 404, message: 'Jawaban tidak ditemukan' };
    }

    const answer = answers[0];
    if (answer.teacher_id !== teacherId) {
      throw { status: 403, message: 'Akses ditolak' };
    }

    if (score > answer.max_score) {
      return response.error(res, `Nilai maksimal untuk soal ini adalah ${answer.max_score}`, 400);
    }

    // Update grade
    await connection.query(`
      UPDATE cbt_answers 
      SET 
        score_awarded = ?,
        teacher_feedback = ?,
        reviewed_by = ?,
        reviewed_at = NOW(),
        grading_status = 'MANUALLY_GRADED'
      WHERE id = ?
    `, [score, feedback || null, userId, answerId]);

    await connection.commit();
    connection.release();

    // Trigger recalculation async
    recalculateAttemptScore(answer.attempt_id).catch(err => console.error(err));

    return response.success(res, { message: 'Penilaian berhasil disimpan.' });
  } catch (err) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    next(err);
  }
}
