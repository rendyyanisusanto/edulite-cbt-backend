import mysql from 'mysql2/promise'
import { env } from './src/config/env.js'

async function run() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name
  })

  try {
    console.log('Dropping fk_cbt_logs_user constraint from cbt_activity_logs to allow polymorphic user_id...')
    
    await connection.execute(`
      ALTER TABLE cbt_activity_logs DROP FOREIGN KEY fk_cbt_logs_user;
    `)
    
    console.log('Success! Constraint dropped.')
  } catch (err) {
    if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log('Foreign key fk_cbt_logs_user does not exist, skipping.')
    } else {
      console.error('Error:', err)
    }
  } finally {
    await connection.end()
  }
}

run()
