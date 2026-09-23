import { pool } from '../config/database.js'

export async function getAcademicYears() {
  const [rows] = await pool.execute(`
    SELECT id, name, start_date, end_date, is_active
    FROM academic_years
    ORDER BY is_active DESC, name DESC
  `)
  return rows
}

export async function getTeachers() {
  const [rows] = await pool.execute(`
    SELECT t.id, t.user_id, t.nip, t.full_name as name, u.email
    FROM teachers t
    JOIN users u ON t.user_id = u.id
    WHERE u.is_active = 1
    ORDER BY t.full_name ASC
  `)
  return rows
}

export async function getClasses() {
  const [rows] = await pool.execute(`
    SELECT id, grade_id, department_id, name, capacity
    FROM classes
    ORDER BY name ASC
  `)
  return rows
}

export async function getSubjects() {
  const [rows] = await pool.execute(`
    SELECT id, code, name, subject_type, is_active
    FROM subjects
    WHERE is_active = 1
    ORDER BY name ASC
  `)
  return rows
}
