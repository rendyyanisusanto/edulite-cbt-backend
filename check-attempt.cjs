const mysql = require('mysql2/promise');
const dbConfig = require('./src/config/database');
async function run() {
  const pool = mysql.createPool(dbConfig);
  try {
    const [rows] = await pool.query('SELECT * FROM cbt_attempts WHERE id = 3');
    console.log('Attempt 3:', rows);
    if(rows.length > 0) {
      const [cep] = await pool.query('SELECT * FROM cbt_exam_participants WHERE id = ?', [rows[0].participant_id]);
      console.log('Participant:', cep);
      const [ces] = await pool.query('SELECT * FROM cbt_exam_schedules WHERE id = ?', [cep[0].schedule_id]);
      console.log('Schedule:', ces);
      const [cea] = await pool.query('SELECT * FROM cbt_exam_assignments WHERE id = ?', [ces[0].exam_assignment_id]);
      console.log('Assignment:', cea);
      const [questions] = await pool.query('SELECT COUNT(*) as c FROM cbt_exam_questions WHERE exam_assignment_id = ?', [cea[0].id]);
      console.log('Questions count:', questions);
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
