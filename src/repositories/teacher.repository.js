import { pool } from '../config/database.js'

export async function getTeacherAssignments(userId) {
  const [rows] = await pool.execute(`
    SELECT a.id, a.exam_id as examId, a.teacher_id as teacherId, a.subject_id as subjectId, a.class_id as classId,
           a.target_choice_questions as targetChoiceQuestions, a.target_essay_questions as targetEssayQuestions,
           a.duration_minutes as durationMinutes, a.passing_score as passingScore,
           a.shuffle_questions as shuffleQuestions, a.shuffle_options as shuffleOptions,
           a.max_attempts as maxAttempts,
           (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = a.id AND q.question_type = 'SINGLE_CHOICE') as choiceCount,
           (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = a.id AND q.question_type = 'ESSAY') as essayCount,
           (SELECT COUNT(DISTINCT cep.id) FROM cbt_exam_schedules ces JOIN cbt_exam_participants cep ON ces.id = cep.schedule_id WHERE ces.exam_assignment_id = a.id AND cep.is_eligible = 1) as participantCount,
           (SELECT AVG(att.final_score) FROM cbt_exam_schedules ces JOIN cbt_exam_participants cep ON ces.id = cep.schedule_id JOIN cbt_attempts att ON cep.id = att.participant_id WHERE ces.exam_assignment_id = a.id AND att.status IN ('SUBMITTED', 'TIME_EXPIRED', 'COMPLETED')) as averageScore,
           t.full_name as teacherName, s.name as subjectName, c.name as className, 
           e.title as examName, e.code as examCode, e.exam_type as examType, e.status as examStatus,
           ay.name as academicYear, e.semester
    FROM cbt_exam_assignments a
    JOIN teachers t ON a.teacher_id = t.id
    JOIN subjects s ON a.subject_id = s.id
    JOIN classes c ON a.class_id = c.id
    JOIN cbt_exams e ON a.exam_id = e.id
    JOIN academic_years ay ON e.academic_year_id = ay.id
    WHERE t.user_id = ?
    ORDER BY a.created_at DESC
  `, [userId])
  return rows
}

export async function getTeacherAssignmentById(userId, assignmentId) {
  const [rows] = await pool.execute(`
    SELECT a.id, a.exam_id as examId, a.teacher_id as teacherId, a.subject_id as subjectId, a.class_id as classId,
           a.target_choice_questions as targetChoiceQuestions, a.target_essay_questions as targetEssayQuestions,
           a.duration_minutes as durationMinutes, a.passing_score as passingScore,
           a.shuffle_questions as shuffleQuestions, a.shuffle_options as shuffleOptions,
           a.max_attempts as maxAttempts,
           (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = a.id AND q.question_type = 'SINGLE_CHOICE') as choiceCount,
           (SELECT COUNT(*) FROM cbt_exam_questions q WHERE q.exam_assignment_id = a.id AND q.question_type = 'ESSAY') as essayCount,
           (SELECT COUNT(DISTINCT cep.id) FROM cbt_exam_schedules ces JOIN cbt_exam_participants cep ON ces.id = cep.schedule_id WHERE ces.exam_assignment_id = a.id AND cep.is_eligible = 1) as participantCount,
           (SELECT AVG(att.final_score) FROM cbt_exam_schedules ces JOIN cbt_exam_participants cep ON ces.id = cep.schedule_id JOIN cbt_attempts att ON cep.id = att.participant_id WHERE ces.exam_assignment_id = a.id AND att.status IN ('SUBMITTED', 'TIME_EXPIRED', 'COMPLETED')) as averageScore,
           t.full_name as teacherName, s.name as subjectName, c.name as className, 
           e.title as examName, e.code as examCode, e.exam_type as examType, e.status as examStatus,
           ay.name as academicYear, e.semester
    FROM cbt_exam_assignments a
    JOIN teachers t ON a.teacher_id = t.id
    JOIN subjects s ON a.subject_id = s.id
    JOIN classes c ON a.class_id = c.id
    JOIN cbt_exams e ON a.exam_id = e.id
    JOIN academic_years ay ON e.academic_year_id = ay.id
    WHERE t.user_id = ? AND a.id = ?
  `, [userId, assignmentId])
  return rows[0]
}
