import { response } from '../utils/response.js'

/**
 * Middleware factory: Validate request body against a Zod schema.
 * On failure, returns a 422 with structured field errors.
 *
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const errors = {}
      result.error.errors.forEach((e) => {
        const key = e.path.join('.')
        if (!errors[key]) errors[key] = e.message
      })

      return response.error(res, {
        statusCode: 422,
        message: 'Validasi gagal.',
        errors,
      })
    }

    // Attach the validated (and possibly coerced) data to req.body
    req.body = result.data
    next()
  }
}
