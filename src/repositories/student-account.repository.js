import { pool } from '../config/database.js'

export async function getStudentAccounts(filters) {
  let query = `
    SELECT 
      s.id as studentId, 
      s.full_name as name, 
      s.nis, 
      c.id as classId,
      c.name as className,
      a.username, 
      a.is_active as isActive, 
      a.last_login as lastLogin
    FROM students s
    JOIN (
      SELECT sch.student_id, sch.class_id, sch.academic_year_id 
      FROM student_class_history sch
      JOIN academic_years ay ON sch.academic_year_id = ay.id
      WHERE ay.is_active = 1
    ) current_class ON s.id = current_class.student_id
    JOIN classes c ON current_class.class_id = c.id
    LEFT JOIN cbt_student_accounts a ON s.id = a.student_id
    WHERE s.student_status = 'ACTIVE'
  `
  
  const params = []

  if (filters.search) {
    query += ` AND (s.full_name LIKE ? OR s.nis LIKE ?)`
    params.push(`%${filters.search}%`, `%${filters.search}%`)
  }

  if (filters.classId) {
    query += ` AND c.id = ?`
    params.push(filters.classId)
  }

  if (filters.accountStatus) {
    if (filters.accountStatus === 'HAS_ACCOUNT') {
      query += ` AND a.id IS NOT NULL`
    } else if (filters.accountStatus === 'NO_ACCOUNT') {
      query += ` AND a.id IS NULL`
    } else if (filters.accountStatus === 'ACTIVE') {
      query += ` AND a.id IS NOT NULL AND a.is_active = 1`
    } else if (filters.accountStatus === 'INACTIVE') {
      query += ` AND a.id IS NOT NULL AND a.is_active = 0`
    }
  }
  
  query += ` ORDER BY c.name ASC, s.full_name ASC`

  const [rows] = await pool.execute(query, params)
  return rows.map(r => ({
    studentId: r.studentId,
    name: r.name,
    nis: r.nis,
    class: r.classId ? { id: r.classId, name: r.className } : null,
    account: r.username ? {
      exists: true,
      username: r.username,
      isActive: Boolean(r.isActive),
      lastLogin: r.lastLogin
    } : { exists: false }
  }))
}

export async function getStudentById(id) {
  const [rows] = await pool.execute(`
    SELECT id, full_name, nis FROM students WHERE id = ? AND student_status = 'ACTIVE'
  `, [id])
  return rows[0]
}

export async function getStudentsByClassId(classId) {
  const [rows] = await pool.execute(`
    SELECT s.id, s.full_name, s.nis 
    FROM students s
    JOIN student_class_history sch ON s.id = sch.student_id
    JOIN academic_years ay ON sch.academic_year_id = ay.id
    WHERE ay.is_active = 1 AND sch.class_id = ? AND s.student_status = 'ACTIVE'
  `, [classId])
  return rows
}

export async function getAccountByStudentId(studentId) {
  const [rows] = await pool.execute(`
    SELECT * FROM cbt_student_accounts WHERE student_id = ?
  `, [studentId])
  return rows[0]
}

export async function getAccountByUsername(username) {
  const [rows] = await pool.execute(`
    SELECT * FROM cbt_student_accounts WHERE username = ?
  `, [username])
  return rows[0]
}

export async function createAccount(data, userId) {
  const { studentId, username, passwordHash } = data
  const [result] = await pool.execute(`
    INSERT INTO cbt_student_accounts (student_id, username, password_hash, created_by)
    VALUES (?, ?, ?, ?)
  `, [studentId, username, passwordHash, userId])
  return result.insertId
}

export async function updatePassword(studentId, passwordHash) {
  await pool.execute(`
    UPDATE cbt_student_accounts SET password_hash = ? WHERE student_id = ?
  `, [passwordHash, studentId])
}

export async function updateStatus(studentId, isActive) {
  await pool.execute(`
    UPDATE cbt_student_accounts SET is_active = ? WHERE student_id = ?
  `, [isActive ? 1 : 0, studentId])
}
