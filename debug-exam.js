import { pool } from './src/config/database.js';

async function run() {
  try {
    // get student ID
    const [students] = await pool.query('SELECT id, full_name, nis FROM students WHERE nis = ?', ['0604/0476.421']);
    console.log('Student:', students[0]);

    if (!students[0]) return;
    const studentId = students[0].id;

    const tables = ['cbt_attempts', 'cbt_answers', 'cbt_answer_choices', 'cbt_activity_logs'];
    for (const t of tables) {
      const [rows] = await pool.query(`DESCRIBE ${t}`);
      console.log(t, rows.map(r => r.Field));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

run();
