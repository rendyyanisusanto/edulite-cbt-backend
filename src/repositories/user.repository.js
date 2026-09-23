import { pool } from '../config/database.js'

/**
 * Find a user by username or email (for login).
 * Returns user row or null.
 * @param {string} login - username or email
 * @returns {Promise<object|null>}
 */
export async function findByLogin(login) {
  const sql = `
    SELECT
      u.id,
      u.name,
      u.username,
      u.email,
      u.password_hash,
      u.is_active,
      u.last_login
    FROM users u
    WHERE u.username = ? OR u.email = ?
    LIMIT 1
  `
  const [rows] = await pool.execute(sql, [login, login])
  return rows[0] || null
}

/**
 * Find a user by ID.
 * Returns user row or null.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  const sql = `
    SELECT
      u.id,
      u.name,
      u.username,
      u.email,
      u.is_active
    FROM users u
    WHERE u.id = ?
    LIMIT 1
  `
  const [rows] = await pool.execute(sql, [id])
  return rows[0] || null
}

/**
 * Get all roles for a given user ID.
 * @param {number} userId
 * @returns {Promise<string[]>} array of role names e.g. ['ADMIN', 'GURU']
 */
export async function getRolesByUserId(userId) {
  const sql = `
    SELECT r.name
    FROM roles r
    INNER JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ?
  `
  const [rows] = await pool.execute(sql, [userId])
  return rows.map((r) => r.name)
}

/**
 * Update the last_login timestamp for a user.
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function updateLastLogin(userId) {
  const sql = `UPDATE users SET last_login = NOW() WHERE id = ?`
  await pool.execute(sql, [userId])
}

/**
 * Get teacher ID by user ID.
 * @param {number} userId
 * @returns {Promise<number|null>}
 */
export async function getTeacherIdByUserId(userId) {
  const sql = `SELECT id FROM teachers WHERE user_id = ? LIMIT 1`
  const [rows] = await pool.execute(sql, [userId])
  return rows[0]?.id || null
}
