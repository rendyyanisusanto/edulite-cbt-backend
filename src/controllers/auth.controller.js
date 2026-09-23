import * as authService from '../services/auth.service.js'
import { response } from '../utils/response.js'

/**
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { login: loginInput, password } = req.body
    const result = await authService.loginUser(loginInput, password)

    return response.success(res, {
      statusCode: 200,
      message: 'Login berhasil.',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/me
 * Requires: authenticate middleware
 */
export async function me(req, res, next) {
  try {
    const userId = req.user.sub
    const user = await authService.getCurrentUser(userId)

    return response.success(res, {
      data: { user },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/logout
 * Stateless JWT — frontend clears token.
 */
export async function logout(req, res) {
  return response.success(res, {
    message: 'Logout berhasil.',
  })
}
