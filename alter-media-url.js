import 'dotenv/config'
import mysql from 'mysql2/promise'

async function alterDb() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'edulite-remake',
  })

  try {
    await pool.query('ALTER TABLE cbt_exam_questions MODIFY COLUMN media_url LONGTEXT;')
    console.log('Altered cbt_exam_questions')
    
    await pool.query('ALTER TABLE cbt_questions MODIFY COLUMN media_url LONGTEXT;')
    console.log('Altered cbt_questions')

    await pool.query('ALTER TABLE cbt_question_options MODIFY COLUMN media_url LONGTEXT;')
    console.log('Altered cbt_question_options')

    await pool.query('ALTER TABLE cbt_exam_question_options MODIFY COLUMN media_url LONGTEXT;')
    console.log('Altered cbt_exam_question_options')

  } catch (err) {
    console.error('Error:', err.message)
  }
  
  await pool.end()
}

alterDb()
