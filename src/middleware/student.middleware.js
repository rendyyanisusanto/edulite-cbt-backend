import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { response } from '../utils/response.js'

export const requireStudent = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.error(res, {
        statusCode: 401,
        message: 'Akses ditolak. Token tidak valid.',
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, env.jwt.secret)

    if (decoded.type !== 'STUDENT') {
      return response.error(res, {
        statusCode: 403,
        message: 'Akses ditolak. Token bukan untuk siswa.',
      })
    }

    req.student = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return response.error(res, {
        statusCode: 401,
        message: 'Sesi telah berakhir. Silakan login kembali.',
      })
    }
    return response.error(res, {
      statusCode: 401,
      message: 'Token tidak valid.',
    })
  }
}
