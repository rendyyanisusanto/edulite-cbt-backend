import 'dotenv/config'
import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'

async function runMigrations() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'edulite-remake',
    multipleStatements: true
  })

  const migrationsDir = path.join(process.cwd(), 'database', 'migrations')
  const files = fs.readdirSync(migrationsDir).sort()

  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log(`Running migration: ${file}`)
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf8')
      
      try {
        await pool.query(sql)
        console.log(`✅ Success: ${file}`)
      } catch (err) {
        console.error(`❌ Error in ${file}:`, err.message)
        break; // stop on first error
      }
    }
  }

  await pool.end()
}

runMigrations()
