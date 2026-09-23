import { pool } from './src/config/database.js';

async function checkSchema() {
  try {
    const [schedulesCols] = await pool.query(`SHOW COLUMNS FROM cbt_exam_schedules`);
    console.log("cbt_exam_schedules columns:", schedulesCols.map(c => c.Field).join(', '));
    
    const [examsCols] = await pool.query(`SHOW COLUMNS FROM cbt_exams`);
    console.log("cbt_exams columns:", examsCols.map(c => c.Field).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();
