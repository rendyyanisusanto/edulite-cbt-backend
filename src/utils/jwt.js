import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

/**
 * Sign a JWT token.
 * @param {object} payload
 * @returns {string}
 */
export function signToken(payload) {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  })
}

/**
 * Verify a JWT token.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {Error} if token is invalid or expired
 */
export function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret)
}
