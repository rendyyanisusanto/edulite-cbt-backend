import { pool } from '../config/database.js'

export async function getAllExams() {
  const [rows] = await pool.execute(`
    SELECT e.id, e.code, e.title, e.semester, e.exam_type, e.description, 
           e.instructions, e.status, e.created_at, e.updated_at,
           ay.name as academicYear, ay.id as academicYearId
    FROM cbt_exams e
    JOIN academic_years ay ON e.academic_year_id = ay.id
    WHERE e.deleted_at IS NULL
    ORDER BY e.created_at DESC
  `)
  return rows
}

export async function getExamById(id) {
  const [rows] = await pool.execute(`
    SELECT e.id, e.code, e.title, e.semester, e.exam_type, e.description, 
           e.instructions, e.status, e.created_at, e.updated_at,
           ay.name as academicYear, ay.id as academicYearId
    FROM cbt_exams e
    JOIN academic_years ay ON e.academic_year_id = ay.id
    WHERE e.id = ? AND e.deleted_at IS NULL
  `, [id])
  return rows[0]
}

export async function createExam(examData, userId) {
  const { code, title, academicYearId, semester, examType, description, instructions, status, durationMinutes } = examData
  
  const [result] = await pool.execute(`
    INSERT INTO cbt_exams (
      code, title, academic_year_id, semester, exam_type, 
      description, instructions, status, created_by, duration_minutes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [code, title, academicYearId, semester, examType, description, instructions, status || 'DRAFT', userId, durationMinutes || 120])
  
  return result.insertId
}

export async function updateExam(id, examData, userId) {
  const { code, title, academicYearId, semester, examType, description, instructions, status } = examData
  
  await pool.execute(`
    UPDATE cbt_exams SET 
      code = ?, title = ?, academic_year_id = ?, semester = ?, exam_type = ?, 
      description = ?, instructions = ?, status = ?, updated_by = ?
    WHERE id = ? AND deleted_at IS NULL
  `, [code, title, academicYearId, semester, examType, description, instructions, status, userId, id])
}

export async function deleteExam(id, userId) {
  await pool.execute(`
    UPDATE cbt_exams SET deleted_at = NOW(), updated_by = ? WHERE id = ?
  `, [userId, id])
}

export async function checkCodeExists(code, excludeId = null) {
  let query = 'SELECT id FROM cbt_exams WHERE code = ? AND deleted_at IS NULL'
  const params = [code]
  
  if (excludeId) {
    query += ' AND id != ?'
    params.push(excludeId)
  }
  
  const [rows] = await pool.execute(query, params)
  return rows.length > 0
}
