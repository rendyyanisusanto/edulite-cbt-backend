/**
 * Standard API response helper.
 */
export const response = {
  /**
   * @param {import('express').Response} res
   * @param {object} options
   */
  success(res, { statusCode = 200, message = 'Request successful', data = null } = {}) {
    const body = { success: true, message }
    if (data !== null) body.data = data
    return res.status(statusCode).json(body)
  },

  /**
   * @param {import('express').Response} res
   * @param {object|string} optionsOrMessage
   * @param {number} [legacyStatusCode]
   */
  error(res, optionsOrMessage = {}, legacyStatusCode) {
    let statusCode = 500;
    let message = 'Something went wrong';
    let errors = null;

    if (typeof optionsOrMessage === 'string') {
      message = optionsOrMessage;
      statusCode = legacyStatusCode || 500;
    } else {
      statusCode = optionsOrMessage.statusCode || 500;
      message = optionsOrMessage.message || 'Something went wrong';
      errors = optionsOrMessage.errors || null;
    }

    const body = { success: false, message }
    if (errors !== null) body.errors = errors
    return res.status(statusCode).json(body)
  },
}
