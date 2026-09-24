import mysql from 'mysql2/promise'
import env from './src/config/env.js'

async function run() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database
  })

  try {
    console.log('Adding answer_file_url to cbt_answers table...')
    await connection.execute(`
      ALTER TABLE cbt_answers
      ADD COLUMN answer_file_url VARCHAR(500) NULL DEFAULT NULL AFTER answer_text;
    `)
    console.log('Success!')
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column answer_file_url already exists, skipping.')
    } else {
      console.error('Error:', err)
    }
  } finally {
    await connection.end()
  }
}

run()
