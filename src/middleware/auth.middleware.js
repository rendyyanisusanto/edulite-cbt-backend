import { verifyToken } from '../utils/jwt.js'
import { response } from '../utils/response.js'

/**
 * Middleware: Verify Bearer token.
 * Attaches decoded payload to req.user.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.error(res, { statusCode: 401, message: 'Akses tidak diizinkan. Token tidak ditemukan.' })
  }

  const token = authHeader.slice(7)
  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return response.error(res, { statusCode: 401, message: 'Sesi telah berakhir. Silakan login kembali.' })
    }
    return response.error(res, { statusCode: 401, message: 'Token tidak valid.' })
  }
}
