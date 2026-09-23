const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({host:'localhost',user:'root',database:'edulite-remake'});
    const query = `
      SELECT 
        cep.id AS participantId,
        cep.participant_status,
        cep.is_eligible,
        
        ces.id AS scheduleId,
        ces.start_at,
        ces.end_at,
        ces.duration_minutes AS scheduleDuration,
        ces.status AS scheduleStatus,
        
        cea.id AS assignmentId,
        cea.target_choice_questions,
        cea.target_essay_questions,
        
        ce.id AS examId,
        ce.title AS examTitle,
        ce.duration_minutes AS examDuration,
        
        sub.id AS subjectId,
        sub.name AS subjectName,
        
        c.id AS classId,
        c.name AS className
        
      FROM cbt_exam_participants cep
      JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
      JOIN cbt_exams ce ON ces.exam_id = ce.id
      JOIN cbt_exam_assignments cea ON cea.exam_id = ce.id AND cea.class_id = cep.class_id
      JOIN subjects sub ON cea.subject_id = sub.id
      JOIN classes c ON cep.class_id = c.id
      
      WHERE cep.student_id = ? 
        AND cep.is_eligible = 1
        AND ce.status IN ('READY', 'PUBLISHED', 'FINISHED')
    `;
    const [rows] = await conn.query(query, [1]);
    console.log(rows);
    conn.end();
  } catch (e) {
    console.error('SQL Error:', e.message);
  }
}
run();
