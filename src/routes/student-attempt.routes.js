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

// Deterministic random number generator using seed (pseudo-random)
// A simple linear congruential generator (LCG)
class LCG {
  constructor(seedString) {
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      hash = (Math.imul(31, hash) + seedString.charCodeAt(i)) | 0;
    }
    this.seed = Math.abs(hash);
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return Math.abs(this.seed) / 233280;
  }
}

const shuffleArray = (array, seedString) => {
  const rng = new LCG(seedString);
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Helper to check and expire attempt
const checkAndExpireAttempt = async (attempt, conn = pool) => {
  if (attempt.status !== 'IN_PROGRESS') {
    return { expired: true, message: 'Sesi ujian sudah tidak aktif.' };
  }
  const now = new Date();
  if (new Date(attempt.expires_at) <= now) {
    // Auto expire
    await conn.query(`UPDATE cbt_attempts SET status = 'TIME_EXPIRED', submitted_at = NOW() WHERE id = ?`, [attempt.id]);
    
    // Log activity
    await conn.query(`INSERT INTO cbt_activity_logs (attempt_id, event_type, description) VALUES (?, ?, ?)`, [attempt.id, 'TIME_EXPIRED', 'Waktu ujian telah habis']);
    
    // Change participant status to FINISHED
    if (attempt.participant_id) {
      await conn.query(`UPDATE cbt_exam_participants SET participant_status = 'FINISHED' WHERE id = ?`, [attempt.participant_id]);
    }
    
    // Optionally trigger auto grading here (can be deferred or called by a job)
    return { expired: true, message: 'Waktu ujian telah berakhir.' };
  }
  return { expired: false };
}

// GET /api/student/attempts/:attemptId/time
router.get('/:attemptId/time', requireStudent, async (req, res, next) => {
  try {
    const studentId = req.student.studentId;
    const { attemptId } = req.params;

    const query = `
      SELECT att.id, att.status, att.expires_at, att.participant_id
      FROM cbt_attempts att
      JOIN cbt_exam_participants cep ON att.participant_id = cep.id
      WHERE att.id = ? AND cep.student_id = ?
    `;

    const [rows] = await pool.query(query, [attemptId, studentId]);

    if (rows.length === 0) {
      return response.error(res, 'Sesi ujian tidak ditemukan.', 404);
    }

    const attempt = rows[0];
    const { expired, message } = await checkAndExpireAttempt(attempt);

    return response.success(res, {
      data: {
        serverTime: formatISO(new Date()),
        expiresAt: formatISO(attempt.expires_at),
        status: expired ? 'TIME_EXPIRED' : attempt.status
      }
    });
  } catch (error) {
    next(error);
  }
});


// GET /api/student/attempts/:attemptId
router.get('/:attemptId', requireStudent, async (req, res, next) => {
  try {
    const studentId = req.student.studentId;
    const { attemptId } = req.params;

    const query = `
      SELECT 
        att.id AS attemptId,
        att.status,
        att.started_at,
        att.expires_at,
        att.last_activity_at,
        att.randomization_seed,
        
        ce.title AS examTitle,
        ce.exam_type AS examType,
        
        sub.name AS subjectName,
        
        c.name AS className,
        
        cea.id AS assignmentId,
        cea.shuffle_questions,
        cea.shuffle_options,
        cea.target_choice_questions,
        cea.target_essay_questions
        
      FROM cbt_attempts att
      JOIN cbt_exam_participants cep ON att.participant_id = cep.id
      JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
      JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
      JOIN cbt_exams ce ON cea.exam_id = ce.id
      JOIN subjects sub ON cea.subject_id = sub.id
      JOIN classes c ON cea.class_id = c.id
      WHERE att.id = ? AND cep.student_id = ?
    `;

    const [rows] = await pool.query(query, [attemptId, studentId]);

    if (rows.length === 0) {
      return response.error(res, 'Sesi ujian tidak ditemukan.', 404);
    }

    const row = rows[0];

    return response.success(res, {
      data: {
        attempt: {
          id: row.attemptId,
          status: row.status,
          startedAt: formatISO(row.started_at),
          expiresAt: formatISO(row.expires_at),
          lastActivityAt: formatISO(row.last_activity_at)
        },
        exam: {
          title: row.examTitle,
          subject: row.subjectName,
          class: row.className
        },
        serverTime: formatISO(new Date()),
        summary: {
          totalQuestions: row.target_choice_questions + row.target_essay_questions
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/student/attempts/:attemptId/questions
router.get('/:attemptId/questions', requireStudent, async (req, res, next) => {
  try {
    const studentId = req.student.studentId;
    const { attemptId } = req.params;

    // Verify attempt and get assignment config
    const verifyQuery = `
      SELECT 
        att.id,
        att.status,
        att.expires_at,
        att.participant_id,
        att.randomization_seed,
        cea.id AS assignmentId,
        cea.shuffle_questions,
        cea.shuffle_options,
        cea.target_choice_questions,
        cea.target_essay_questions
      FROM cbt_attempts att
      JOIN cbt_exam_participants cep ON att.participant_id = cep.id
      JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
      JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
      WHERE att.id = ? AND cep.student_id = ?
    `;
    const [verifyRows] = await pool.query(verifyQuery, [attemptId, studentId]);
    
    if (verifyRows.length === 0) {
      return response.error(res, 'Sesi ujian tidak ditemukan.', 404);
    }
    
    const attempt = verifyRows[0];
    const { expired, message } = await checkAndExpireAttempt(attempt);
    if (expired) {
      // Return 403 or we can still return questions but marked as expired?
      // Since it's /questions, better to not let them load if expired unless for review.
      // We will allow them to fetch, but the frontend should handle TIME_EXPIRED.
      // Wait, let's just return 403 so frontend knows to kick them out.
      return response.error(res, message, 403);
    }
    
    const { randomization_seed, assignmentId, shuffle_questions, shuffle_options, target_choice_questions, target_essay_questions } = attempt;

    // Load questions
    const [questions] = await pool.query(`
      SELECT id, question_type, question_text, media_url
      FROM cbt_exam_questions
      WHERE exam_assignment_id = ?
    `, [assignmentId]);

    // Load options for SINGLE_CHOICE questions
    const choiceQuestionIds = questions.filter(q => q.question_type === 'SINGLE_CHOICE').map(q => q.id);
    let options = [];
    if (choiceQuestionIds.length > 0) {
      const [loadedOptions] = await pool.query(`
        SELECT id, exam_question_id, option_key, option_text
        FROM cbt_exam_question_options
        WHERE exam_question_id IN (?)
      `, [choiceQuestionIds]);
      options = loadedOptions;
    }

    // Process questions
    let finalQuestions = questions.map(q => {
      const qObj = {
        id: q.id,
        questionType: q.question_type,
        questionText: q.question_text,
        mediaUrl: q.media_url
      };

      if (q.question_type === 'SINGLE_CHOICE') {
        const qOptions = options.filter(o => o.exam_question_id === q.id).map(o => ({
          id: o.id,
          text: o.option_text
        }));

        if (shuffle_options) {
          qObj.options = shuffleArray(qOptions, randomization_seed + ":question:" + q.id);
        } else {
          qObj.options = qOptions.sort((a, b) => a.id - b.id);
        }
        
        // Assign displayKey (A, B, C...) based on final sorted/shuffled order
        const letters = ['A', 'B', 'C', 'D', 'E'];
        qObj.options.forEach((opt, idx) => {
          opt.displayKey = letters[idx] || '?';
        });
      }

      return qObj;
    });

    // Separate by type to apply limits (targets)
    let choiceQuestions = finalQuestions.filter(q => q.questionType === 'SINGLE_CHOICE');
    let essayQuestions = finalQuestions.filter(q => q.questionType === 'ESSAY');

    // Shuffle and slice for Choice
    if (shuffle_questions) {
      choiceQuestions = shuffleArray(choiceQuestions, randomization_seed + ":choice_questions");
    } else {
      choiceQuestions.sort((a, b) => a.id - b.id);
    }
    choiceQuestions = choiceQuestions.slice(0, target_choice_questions);

    // Shuffle and slice for Essay
    if (shuffle_questions) {
      essayQuestions = shuffleArray(essayQuestions, randomization_seed + ":essay_questions");
    } else {
      essayQuestions.sort((a, b) => a.id - b.id);
    }
    essayQuestions = essayQuestions.slice(0, target_essay_questions);

    // Combine them back (Choice first, then Essay is a common standard, or shuffle them together if desired)
    // To preserve random mix, we can combine and optionally re-shuffle
    finalQuestions = [...choiceQuestions, ...essayQuestions];
    if (shuffle_questions) {
      finalQuestions = shuffleArray(finalQuestions, randomization_seed + ":mixed_questions");
    }

    // Load existing answers
    const [answers] = await pool.query(`
      SELECT 
        ans.id AS answerId,
        ans.exam_question_id,
        ans.answer_text,
        ans.is_flagged,
        ans.version,
        ch.exam_question_option_id
      FROM cbt_answers ans
      LEFT JOIN cbt_answer_choices ch ON ans.id = ch.answer_id
      WHERE ans.attempt_id = ?
    `, [attemptId]);

    const answersMap = {};
    for (const ans of answers) {
      answersMap[ans.exam_question_id] = {
        isFlagged: ans.is_flagged === 1,
        version: ans.version
      };
      if (ans.exam_question_option_id) {
        answersMap[ans.exam_question_id].selectedOptionId = ans.exam_question_option_id;
      }
      if (ans.answer_text !== null) {
        answersMap[ans.exam_question_id].answerText = ans.answer_text;
      }
    }

    return response.success(res, {
      data: {
        questions: finalQuestions,
        answers: answersMap
      }
    });

  } catch (error) {
    next(error);
  }
});

// PUT /api/student/attempts/:attemptId/answers/:questionId
router.put('/:attemptId/answers/:questionId', requireStudent, async (req, res, next) => {
  let connection;
  try {
    const studentId = req.student.studentId;
    const { attemptId, questionId } = req.params;
    const { selectedOptionId, answerText, isFlagged, version } = req.body;

    // 1. Validate Attempt
    const verifyQuery = `
      SELECT att.id, att.status, att.expires_at, att.participant_id 
      FROM cbt_attempts att
      JOIN cbt_exam_participants cep ON att.participant_id = cep.id
      WHERE att.id = ? AND cep.student_id = ?
    `;
    const [verifyRows] = await pool.query(verifyQuery, [attemptId, studentId]);
    if (verifyRows.length === 0) {
      return response.error(res, 'Sesi ujian tidak ditemukan.', 404);
    }
    const attempt = verifyRows[0];
    
    const { expired, message } = await checkAndExpireAttempt(attempt);
    if (expired) {
      return response.error(res, message, 403);
    }

    // 2. Validate Question
    const [qRows] = await pool.query(`SELECT question_type FROM cbt_exam_questions WHERE id = ?`, [questionId]);
    if (qRows.length === 0) {
      return response.error(res, 'Soal tidak ditemukan.', 404);
    }
    const questionType = qRows[0].question_type;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check existing answer
    const [existingAns] = await connection.query(
      `SELECT id, version FROM cbt_answers WHERE attempt_id = ? AND exam_question_id = ? FOR UPDATE`,
      [attemptId, questionId]
    );

    let answerId;
    let newVersion = 1;
    let answeredAt = null;

    if (existingAns.length > 0) {
      const dbVersion = existingAns[0].version;
      if (version && version !== dbVersion) {
        await connection.rollback();
        connection.release();
        return response.error(res, 'Jawaban telah berubah di perangkat lain. Memuat ulang...', 409);
      }
      answerId = existingAns[0].id;
      newVersion = dbVersion + 1;
    }

    if (questionType === 'SINGLE_CHOICE') {
      if (selectedOptionId) answeredAt = new Date();
    } else {
      if (answerText && answerText.trim() !== '') answeredAt = new Date();
    }

    if (!answerId) {
      // INSERT
      const [insertRes] = await connection.query(
        `INSERT INTO cbt_answers (attempt_id, exam_question_id, answer_text, is_flagged, answered_at, grading_status, version) 
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
        [attemptId, questionId, questionType === 'ESSAY' ? answerText : null, isFlagged ? 1 : 0, answeredAt, newVersion]
      );
      answerId = insertRes.insertId;
    } else {
      // UPDATE
      await connection.query(
        `UPDATE cbt_answers 
         SET answer_text = ?, is_flagged = ?, answered_at = ?, version = ?
         WHERE id = ?`,
        [questionType === 'ESSAY' ? answerText : null, isFlagged ? 1 : 0, answeredAt, newVersion, answerId]
      );
    }

    // Handle cbt_answer_choices for SINGLE_CHOICE
    if (questionType === 'SINGLE_CHOICE') {
      await connection.query(`DELETE FROM cbt_answer_choices WHERE answer_id = ?`, [answerId]);
      if (selectedOptionId) {
        // Validate option belongs to question
        const [optRows] = await connection.query(`SELECT id FROM cbt_exam_question_options WHERE id = ? AND exam_question_id = ?`, [selectedOptionId, questionId]);
        if (optRows.length > 0) {
          await connection.query(`INSERT INTO cbt_answer_choices (answer_id, exam_question_option_id) VALUES (?, ?)`, [answerId, selectedOptionId]);
        }
      }
    }

    // Update last_activity_at on attempt
    await connection.query(`UPDATE cbt_attempts SET last_activity_at = NOW() WHERE id = ?`, [attemptId]);

    await connection.commit();
    connection.release();

    return response.success(res, {
      data: {
        version: newVersion,
        savedAt: formatISO(new Date())
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    next(error);
  }
});

// POST /api/student/attempts/:attemptId/submit
router.post('/:attemptId/submit', requireStudent, async (req, res, next) => {
  let connection;
  try {
    const studentId = req.student.studentId;
    const { attemptId } = req.params;

    const verifyQuery = `
      SELECT att.id, att.status, att.expires_at, att.participant_id 
      FROM cbt_attempts att
      JOIN cbt_exam_participants cep ON att.participant_id = cep.id
      WHERE att.id = ? AND cep.student_id = ?
    `;
    const [verifyRows] = await pool.query(verifyQuery, [attemptId, studentId]);
    if (verifyRows.length === 0) {
      return response.error(res, 'Sesi ujian tidak ditemukan.', 404);
    }
    const attempt = verifyRows[0];

    // If already submitted/finished, return idempotent success
    if (['SUBMITTED', 'TIME_EXPIRED', 'COMPLETED'].includes(attempt.status)) {
      return response.success(res, {
        message: 'Ujian sudah diselesaikan sebelumnya.',
        data: { status: attempt.status }
      });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return response.error(res, 'Sesi ujian sudah tidak aktif.', 403);
    }

    const now = new Date();
    const isExpired = new Date(attempt.expires_at) <= now;
    const finalStatus = isExpired ? 'TIME_EXPIRED' : 'SUBMITTED';

    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // Lock attempt
    await connection.query(`SELECT id FROM cbt_attempts WHERE id = ? FOR UPDATE`, [attemptId]);

    // Update status
    await connection.query(
      `UPDATE cbt_attempts SET status = ?, submitted_at = NOW() WHERE id = ?`,
      [finalStatus, attemptId]
    );

    // Update participant
    if (attempt.participant_id) {
      await connection.query(
        `UPDATE cbt_exam_participants SET participant_status = 'FINISHED' WHERE id = ?`,
        [attempt.participant_id]
      );
    }

    // Activity Log
    await connection.query(
      `INSERT INTO cbt_activity_logs (attempt_id, user_id, event_type, description) VALUES (?, ?, ?, ?)`,
      [attemptId, req.student.sub, finalStatus, isExpired ? 'Waktu ujian telah habis dan otomatis diselesaikan' : 'Siswa mengakhiri dan mengumpulkan jawaban ujian']
    );

    await connection.commit();
    connection.release();

    // Trigger auto-grading async
    import('../services/grading.service.js')
      .then(module => module.autoGradeObjective(attemptId))
      .catch(err => console.error("Auto grading error:", err));

    return response.success(res, {
      message: 'Ujian berhasil diselesaikan.',
      data: { status: finalStatus }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    next(error);
  }
});

// GET /api/student/attempts/:attemptId/result
router.get('/:attemptId/result', requireStudent, async (req, res, next) => {
  try {
    const studentId = req.student.studentId;
    const { attemptId } = req.params;

    const query = `
      SELECT 
        att.id, att.status, att.final_score,
        ce.result_visibility, ce.result_published_at,
        ce.title AS examTitle,
        sub.name AS subjectName,
        cea.target_essay_questions
      FROM cbt_attempts att
      JOIN cbt_exam_participants cep ON att.participant_id = cep.id
      JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
      JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
      JOIN cbt_exams ce ON cea.exam_id = ce.id
      JOIN subjects sub ON cea.subject_id = sub.id
      WHERE att.id = ? AND cep.student_id = ?
    `;

    const [rows] = await pool.query(query, [attemptId, studentId]);

    if (rows.length === 0) {
      return response.error(res, 'Sesi ujian tidak ditemukan.', 404);
    }

    const attempt = rows[0];
    
    // Check published_at
    const now = new Date();
    const isPublished = attempt.result_published_at ? new Date(attempt.result_published_at) <= now : false;
    
    const visibility = isPublished ? attempt.result_visibility : 'HIDDEN';
    const hasEssay = attempt.target_essay_questions > 0;
    
    let resultData = {
      status: attempt.status,
      resultVisibility: visibility,
      examTitle: attempt.examTitle,
      subjectName: attempt.subjectName,
      hasEssay: hasEssay
    };

    if (visibility === 'HIDDEN' || !isPublished) {
      resultData.message = 'Hasil ujian belum dipublikasikan.';
    } else if (visibility === 'SCORE_ONLY' || visibility === 'SCORE_AND_ANSWERS' || visibility === 'FULL_REVIEW') {
      // If there are essays, the final_score might be incomplete until grading is done.
      // We can check if attempt status is GRADED vs WAITING_ESSAY_GRADING
      // Wait, does the backend have a status for that?
      // "Tidak ada field khusus pada schema existing? grading status dapat dihitung..."
      // The instructions say: "PG + Essay menunggu grading... Final Score dihitung".
      
      const [pendingEssays] = await pool.query(`
        SELECT COUNT(*) as cnt FROM cbt_answers ans
        JOIN cbt_exam_questions q ON ans.exam_question_id = q.id
        WHERE ans.attempt_id = ? AND q.question_type = 'ESSAY' AND ans.grading_status = 'PENDING'
      `, [attemptId]);
      
      const gradingStatus = pendingEssays[0].cnt > 0 ? 'WAITING_ESSAY_GRADING' : 'GRADED';
      resultData.gradingStatus = gradingStatus;
      
      if (gradingStatus === 'GRADED') {
        resultData.score = attempt.final_score;
      }
      
      // Additional data for FULL_REVIEW could be added here in the future
    }

    return response.success(res, {
      data: resultData
    });
  } catch (error) {
    next(error);
  }
});

export default router;
