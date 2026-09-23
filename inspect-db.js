import 'dotenv/config'
import mysql from 'mysql2/promise'
import fs from 'fs'

async function inspect() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'edulite-remake',
  })

  const tables = [
    'users', 'academic_years', 'teachers', 'classes', 'subjects',
    'cbt_exams', 'cbt_teacher_assignments', 'cbt_question_banks',
    'cbt_questions', 'cbt_question_options', 'cbt_exam_questions',
    'cbt_exam_question_options', 'cbt_exam_schedules', 'cbt_exam_classes',
    'cbt_exam_participants', 'cbt_attempts', 'cbt_answers', 'cbt_answer_choices',
    'cbt_activity_logs'
  ];

  let output = '';

  for (const table of tables) {
    try {
      const [rows] = await pool.execute(`SHOW CREATE TABLE ${table}`);
      output += `\n-- Table: ${table}\n`;
      output += rows[0]['Create Table'] + ';\n\n';
    } catch (err) {
      output += `\n-- Table: ${table}\n-- Error: ${err.message}\n\n`;
    }
  }

  fs.writeFileSync('db-schema.sql', output);
  console.log('Schema dumped to db-schema.sql');
  await pool.end();
}

inspect();
