import bcrypt from 'bcryptjs'
import * as userRepository from '../repositories/user.repository.js'
import { signToken } from '../utils/jwt.js'

// Only users with these roles are allowed to access CBT
// SUPERADMIN and ADMIN both map to admin role in CBT context
const CBT_ALLOWED_ROLES = ['SUPERADMIN', 'ADMIN', 'GURU']

// Maps database role name to the CBT role exposed to frontend
function mapRoleToCBT(roleName) {
  if (roleName === 'SUPERADMIN' || roleName === 'ADMIN') return 'ADMIN'
  if (roleName === 'GURU') return 'GURU'
  return null
}

/**
 * Detect hash algorithm from the stored hash string.
 * Currently supports bcrypt ($2a$, $2b$, $2y$ prefixes).
 * Add more algorithms here as needed.
 * @param {string} hash
 * @returns {'bcrypt'|'unknown'}
 */
function detectHashAlgorithm(hash) {
  if (/^\$2[aby]\$/.test(hash)) return 'bcrypt'
  return 'unknown'
}

/**
 * Verify the plain password against the stored hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  const algorithm = detectHashAlgorithm(hash)

  if (algorithm === 'bcrypt') {
    return bcrypt.compare(password, hash)
  }

  // Fallback: If algorithm is unknown, log a warning and return false.
  // Do NOT expose the hash in logs.
  console.warn('[auth.service] Unknown password hash algorithm detected. Cannot verify password.')
  return false
}

/**
 * Login service.
 * Validates credentials against the existing Edulite database.
 * @param {string} login - username or email
 * @param {string} password
 * @returns {Promise<{accessToken: string, user: object}>}
 */
export async function loginUser(login, password) {
  // 1. Find user
  const user = await userRepository.findByLogin(login)
  if (!user) {
    throw { status: 401, message: 'Username/email atau password tidak sesuai.' }
  }

  // 2. Check if account is active
  if (!user.is_active) {
    throw { status: 403, message: 'Akun tidak aktif. Silakan hubungi administrator.' }
  }

  // 3. Verify password
  const isPasswordValid = await verifyPassword(password, user.password_hash)
  if (!isPasswordValid) {
    throw { status: 401, message: 'Username/email atau password tidak sesuai.' }
  }

  // 4. Get user roles
  const roles = await userRepository.getRolesByUserId(user.id)

  // 5. Check if user has any CBT-allowed roles
  const allowedDBRoles = roles.filter((r) => CBT_ALLOWED_ROLES.includes(r))
  if (allowedDBRoles.length === 0) {
    throw { status: 403, message: 'Akun tidak memiliki akses ke CBT Edulite.' }
  }

  // Map DB roles to CBT roles (SUPERADMIN/ADMIN → ADMIN, GURU → GURU)
  const cbtRoles = [...new Set(allowedDBRoles.map(mapRoleToCBT).filter(Boolean))]

  // 6. Get Teacher ID if GURU
  let teacherId = null
  if (cbtRoles.includes('GURU')) {
    teacherId = await userRepository.getTeacherIdByUserId(user.id)
  }

  // 7. Create JWT — only include non-sensitive payload
  const tokenPayload = {
    sub: user.id,
    username: user.username,
    roles: cbtRoles,
    teacherId,
  }
  const accessToken = signToken(tokenPayload)

  // 8. Update last_login (fire and forget — don't block the response)
  userRepository.updateLastLogin(user.id).catch((err) => {
    console.error('[auth.service] Failed to update last_login:', err.message)
  })

  // 9. Return token and safe user object (NO password_hash)
  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      roles: cbtRoles,
      teacherId,
    },
  }
}

/**
 * Get current user from database (for /me endpoint).
 * Always re-fetches from DB to get fresh data.
 * @param {number} userId
 * @returns {Promise<object>}
 */
export async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId)
  if (!user) {
    throw { status: 401, message: 'Akun tidak ditemukan.' }
  }

  if (!user.is_active) {
    throw { status: 403, message: 'Akun tidak aktif.' }
  }

  const roles = await userRepository.getRolesByUserId(userId)
  const allowedDBRoles = roles.filter((r) => CBT_ALLOWED_ROLES.includes(r))
  const cbtRoles = [...new Set(allowedDBRoles.map(mapRoleToCBT).filter(Boolean))]

  let teacherId = null
  if (cbtRoles.includes('GURU')) {
    teacherId = await userRepository.getTeacherIdByUserId(user.id)
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    roles: cbtRoles,
    teacherId,
  }
}
