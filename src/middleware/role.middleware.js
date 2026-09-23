import { response } from '../utils/response.js'

/**
 * Factory: Create a middleware that allows only specific roles.
 * @param {...string} roles - allowed role names e.g. 'ADMIN', 'GURU'
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.get('/admin-only', authenticate, allowRoles('ADMIN'), handler)
 * router.get('/both', authenticate, allowRoles('ADMIN', 'GURU'), handler)
 */
export function allowRoles(...roles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || []
    const hasRole = roles.some((role) => userRoles.includes(role))

    if (!hasRole) {
      return response.error(res, {
        statusCode: 403,
        message: 'Anda tidak memiliki akses untuk melakukan tindakan ini.',
      })
    }

    next()
  }
}
