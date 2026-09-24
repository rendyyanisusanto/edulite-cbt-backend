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
    console.log('Finding foreign key constraint on cbt_activity_logs.user_id...')
    
    const [rows] = await connection.execute(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'cbt_activity_logs'
        AND COLUMN_NAME = 'user_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [env.db.name]);

    if (rows.length === 0) {
      console.log('No foreign key found on cbt_activity_logs.user_id. You are good to go!');
    } else {
      for (const row of rows) {
        const fkName = row.CONSTRAINT_NAME;
        console.log(`Found foreign key: ${fkName}. Dropping it...`);
        await connection.execute(`ALTER TABLE cbt_activity_logs DROP FOREIGN KEY \`${fkName}\``);
        console.log(`Successfully dropped ${fkName}.`);
      }
    }
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await connection.end()
  }
}

run()
