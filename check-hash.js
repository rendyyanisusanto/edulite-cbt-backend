// Quick script to check password hash format in the database
import 'dotenv/config'
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'edulite-remake',
})

// Check admin user roles
const [adminUser] = await pool.execute("SELECT id, username FROM users WHERE username = 'admin' LIMIT 1")
console.log('\nAdmin user:', adminUser[0])

if (adminUser[0]) {
  const [adminRoles] = await pool.execute(
    `SELECT r.id, r.name FROM roles r 
     INNER JOIN user_roles ur ON ur.role_id = r.id 
     WHERE ur.user_id = ?`, 
    [adminUser[0].id]
  )
  console.log('\nAdmin roles:', adminRoles)
}

// Check rys user
const [guruUser] = await pool.execute("SELECT id, username FROM users WHERE username = 'rys' LIMIT 1")
console.log('\nGuru user (rys):', guruUser[0])

if (guruUser[0]) {
  const [guruRoles] = await pool.execute(
    `SELECT r.id, r.name FROM roles r 
     INNER JOIN user_roles ur ON ur.role_id = r.id 
     WHERE ur.user_id = ?`,
    [guruUser[0].id]
  )
  console.log('\nGuru roles:', guruRoles)
}

await pool.end()
