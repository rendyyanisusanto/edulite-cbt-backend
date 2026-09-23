import mysql from 'mysql2/promise'
import { env } from './env.js'

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
})

export async function checkDatabaseConnection() {
  let connection
  try {
    connection = await pool.getConnection()
    await connection.query('SELECT 1')
    console.log(`✅ Database connected: ${env.db.name}`)
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`)
    throw error
  } finally {
    if (connection) connection.release()
  }
}
