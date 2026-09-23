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
        
        ce.id AS examId,
        ce.title AS examTitle,
        ce.duration_minutes AS examDuration,
        
        sub.id AS subjectId,
        sub.name AS subjectName,
        
        c.id AS classId,
        c.name AS className,
        
        (SELECT COUNT(*) FROM cbt_exam_questions ceq WHERE ceq.exam_id = ce.id AND ceq.question_type = 'SINGLE_CHOICE') as choice_questions,
        (SELECT COUNT(*) FROM cbt_exam_questions ceq WHERE ceq.exam_id = ce.id AND ceq.question_type = 'ESSAY') as essay_questions
        
      FROM cbt_exam_participants cep
      JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
      JOIN cbt_exams ce ON ces.exam_id = ce.id
      JOIN subjects sub ON ce.subject_id = sub.id
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
