import { env } from '../config/env.js'
import { response } from '../utils/response.js'

/**
 * Global error handler middleware.
 * Must be registered LAST in Express app (4 arguments).
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Log the full error in development only
  if (env.isDev) {
    console.error('[Error]', err)
  } else {
    // In production, only log safe info
    console.error(`[Error] ${req.method} ${req.path} — ${err.message || err}`)
  }

  // Handle service-thrown structured errors: { status, message }
  if (err.status && err.message) {
    return response.error(res, { statusCode: err.status, message: err.message })
  }

  // Handle Zod validation errors (if thrown manually)
  if (err.name === 'ZodError') {
    const errors = {}
    err.errors.forEach((e) => {
      const key = e.path.join('.')
      errors[key] = e.message
    })
    return response.error(res, {
      statusCode: 422,
      message: 'Validasi gagal.',
      errors,
    })
  }

  // Generic fallback — never expose internals
  return response.error(res, {
    statusCode: 500,
    message: 'Terjadi kesalahan pada server. Silakan coba kembali.',
  })
}
