import { pool } from '../config/database.js'

export async function getAllAssignments() {
  const [rows] = await pool.execute(`
    SELECT a.id, a.exam_id as examId, a.teacher_id as teacherId, a.subject_id as subjectId, a.class_id as classId,
           a.target_choice_questions as targetChoiceQuestions, a.target_essay_questions as targetEssayQuestions,
           a.duration_minutes as durationMinutes, a.passing_score as passingScore,
           a.shuffle_questions as shuffleQuestions, a.shuffle_options as shuffleOptions,
           a.max_attempts as maxAttempts,
           (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = a.id AND q.question_type = 'SINGLE_CHOICE') as choiceCount,
           (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = a.id AND q.question_type = 'ESSAY') as essayCount,
           t.full_name as teacherName, s.name as subjectName, c.name as className, e.title as examName
    FROM cbt_exam_assignments a
    JOIN teachers t ON a.teacher_id = t.id
    JOIN subjects s ON a.subject_id = s.id
    JOIN classes c ON a.class_id = c.id
    JOIN cbt_exams e ON a.exam_id = e.id
    ORDER BY a.created_at DESC
  `)
  return rows
}

export async function getAssignmentsByExamId(examId) {
  const [rows] = await pool.execute(`
    SELECT a.id, a.exam_id as examId, a.teacher_id as teacherId, a.subject_id as subjectId, a.class_id as classId,
           a.target_choice_questions as targetChoiceQuestions, a.target_essay_questions as targetEssayQuestions,
           a.duration_minutes as durationMinutes, a.passing_score as passingScore,
           a.shuffle_questions as shuffleQuestions, a.shuffle_options as shuffleOptions,
           a.max_attempts as maxAttempts,
           (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = a.id AND q.question_type = 'SINGLE_CHOICE') as choiceCount,
           (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = a.id AND q.question_type = 'ESSAY') as essayCount,
           t.full_name as teacherName, s.name as subjectName, c.name as className, e.title as examName
    FROM cbt_exam_assignments a
    JOIN teachers t ON a.teacher_id = t.id
    JOIN subjects s ON a.subject_id = s.id
    JOIN classes c ON a.class_id = c.id
    JOIN cbt_exams e ON a.exam_id = e.id
    WHERE a.exam_id = ?
    ORDER BY a.created_at DESC
  `, [examId])
  return rows
}

export async function getAssignmentById(id) {
  const [rows] = await pool.execute(`
    SELECT a.id, a.exam_id as examId, a.teacher_id as teacherId, a.subject_id as subjectId, a.class_id as classId,
           a.target_choice_questions as targetChoiceQuestions, a.target_essay_questions as targetEssayQuestions,
           a.duration_minutes as durationMinutes, a.passing_score as passingScore,
           a.shuffle_questions as shuffleQuestions, a.shuffle_options as shuffleOptions,
           a.max_attempts as maxAttempts,
           (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = a.id AND q.question_type = 'SINGLE_CHOICE') as choiceCount,
           (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = a.id AND q.question_type = 'ESSAY') as essayCount,
           t.full_name as teacherName, s.name as subjectName, c.name as className, e.title as examName
    FROM cbt_exam_assignments a
    JOIN teachers t ON a.teacher_id = t.id
    JOIN subjects s ON a.subject_id = s.id
    JOIN classes c ON a.class_id = c.id
    JOIN cbt_exams e ON a.exam_id = e.id
    WHERE a.id = ?
  `, [id])
  return rows[0]
}

export async function checkUniqueAssignment(examId, teacherId, subjectId, classId, excludeId = null) {
  let query = 'SELECT id FROM cbt_exam_assignments WHERE exam_id = ? AND teacher_id = ? AND subject_id = ? AND class_id = ?'
  const params = [examId, teacherId, subjectId, classId]
  if (excludeId) {
    query += ' AND id != ?'
    params.push(excludeId)
  }
  const [rows] = await pool.execute(query, params)
  return rows.length > 0
}

export async function createAssignment(examId, data, userId) {
  const { teacherId, subjectId, classId, targetChoiceQuestions, targetEssayQuestions } = data
  const [result] = await pool.execute(`
    INSERT INTO cbt_exam_assignments (
      exam_id, teacher_id, subject_id, class_id, 
      target_choice_questions, target_essay_questions,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [examId, teacherId, subjectId, classId, targetChoiceQuestions, targetEssayQuestions, userId])
  
  return result.insertId
}

export async function createBulkAssignments(examId, data, userId) {
  const { teacherId, items } = data
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [existingRows] = await connection.execute(
      'SELECT subject_id, class_id FROM cbt_exam_assignments WHERE exam_id = ? AND teacher_id = ?',
      [examId, teacherId]
    )
    const existingSet = new Set(existingRows.map((r) => `${r.subject_id}:${r.class_id}`))

    const insertedIds = []
    let skippedCount = 0

    for (const item of items) {
      const key = `${item.subjectId}:${item.classId}`
      if (existingSet.has(key)) {
        skippedCount++
        continue
      }
      existingSet.add(key)

      const [result] = await connection.execute(
        `INSERT INTO cbt_exam_assignments (
          exam_id, teacher_id, subject_id, class_id,
          target_choice_questions, target_essay_questions,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [examId, teacherId, item.subjectId, item.classId, item.targetChoiceQuestions, item.targetEssayQuestions, userId]
      )
      insertedIds.push(result.insertId)
    }

    await connection.commit()
    return { insertedIds, skippedCount }
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

export async function updateAssignment(id, data, userId) {
  const { teacherId, subjectId, classId, targetChoiceQuestions, targetEssayQuestions } = data
  await pool.execute(`
    UPDATE cbt_exam_assignments SET 
      teacher_id = ?, subject_id = ?, class_id = ?, 
      target_choice_questions = ?, target_essay_questions = ?,
      updated_by = ?
    WHERE id = ?
  `, [teacherId, subjectId, classId, targetChoiceQuestions, targetEssayQuestions, userId, id])
}

export async function deleteAssignment(id) {
  await pool.execute('DELETE FROM cbt_exam_assignments WHERE id = ?', [id])
}
