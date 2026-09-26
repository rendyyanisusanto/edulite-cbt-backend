import { pool } from '../config/database.js'
import { env } from '../config/env.js'

const formatISO = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toISOString();
}

function getEffectiveStatus(schedule, now) {
  if (schedule.examStatus === 'FINISHED' || schedule.scheduleStatus === 'CANCELLED' || schedule.scheduleStatus === 'CLOSED') {
    return 'EXPIRED';
  }
  const start = new Date(schedule.start_at);
  const end = new Date(schedule.end_at);
  if (now < start) return 'UPCOMING';
  if (now > end) return 'EXPIRED';
  return 'LIVE';
}

function getEffectiveParticipantStatus(p, now, staleMinutes) {
  if (p.participant_status === 'BLOCKED') return 'BLOCKED';
  
  if (!p.attempt_id) {
    return 'NOT_STARTED';
  }

  if (p.attempt_status === 'SUBMITTED' || p.attempt_status === 'TIME_EXPIRED') {
    return p.attempt_status; // SUBMITTED or TIME_EXPIRED
  }

  if (p.attempt_status === 'IN_PROGRESS') {
    return 'IN_PROGRESS';
  }
  
  if (p.attempt_status === 'PAUSED') {
    return 'PAUSED';
  }
  
  return 'NOT_STARTED';
}

export async function getMonitoringSchedulesList(userId = null) {
  const params = [];
  if (userId !== null) {
    params.push(userId);
  }

  const query = `
    SELECT 
      ces.id AS scheduleId,
      ce.title AS examTitle,
      ce.status AS examStatus,
      sub.name AS subjectName,
      c.name AS className,
      t.full_name AS teacherName,
      ces.start_at,
      ces.end_at,
      COALESCE(ces.duration_minutes, ce.duration_minutes) AS durationMinutes,
      ces.status AS scheduleStatus,
      (SELECT COUNT(*) FROM cbt_exam_participants cep WHERE cep.schedule_id = ces.id AND cep.is_eligible = 1) AS participantCount
    FROM cbt_exam_schedules ces
    JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
    JOIN cbt_exams ce ON cea.exam_id = ce.id
    JOIN subjects sub ON cea.subject_id = sub.id
    JOIN classes c ON cea.class_id = c.id
    JOIN teachers t ON cea.teacher_id = t.id
    ${userId !== null ? 'WHERE t.user_id = ?' : ''}
    ORDER BY ces.start_at DESC, ces.id DESC
  `;

  const [rows] = await pool.query(query, params);
  const now = new Date();

  return rows.map(row => ({
    scheduleId: row.scheduleId,
    examTitle: row.examTitle,
    subjectName: row.subjectName,
    className: row.className,
    teacherName: row.teacherName,
    startAt: formatISO(row.start_at),
    endAt: formatISO(row.end_at),
    durationMinutes: row.durationMinutes,
    status: getEffectiveStatus(row, now),
    participantCount: row.participantCount
  }));
}

export async function getMonitoringScheduleDetail(scheduleId, userId = null) {
  const staleMinutes = Number(env.MONITOR_STALE_MINUTES || 5);
  const params = [scheduleId];
  if (userId !== null) {
    params.push(userId);
  }

  // 1. Get Schedule Header
  const [schedules] = await pool.query(`
    SELECT 
      ces.id,
      ce.title AS examTitle,
      ce.status AS examStatus,
      sub.name AS subjectName,
      c.name AS className,
      ces.start_at,
      ces.end_at,
      COALESCE(ces.duration_minutes, ce.duration_minutes) AS durationMinutes,
      ces.status AS scheduleStatus,
      cea.target_choice_questions,
      cea.target_essay_questions
    FROM cbt_exam_schedules ces
    JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
    JOIN cbt_exams ce ON cea.exam_id = ce.id
    JOIN subjects sub ON cea.subject_id = sub.id
    JOIN classes c ON cea.class_id = c.id
    ${userId !== null ? 'JOIN teachers t ON cea.teacher_id = t.id' : ''}
    WHERE ces.id = ? ${userId !== null ? 'AND t.user_id = ?' : ''}
  `, params);

  if (schedules.length === 0) {
    throw { status: 404, message: 'Jadwal ujian tidak ditemukan atau Anda tidak memiliki akses.' };
  }

  const schedule = schedules[0];
  const now = new Date();
  
  const scheduleData = {
    id: schedule.id,
    examTitle: schedule.examTitle,
    subjectName: schedule.subjectName,
    className: schedule.className,
    startAt: formatISO(schedule.start_at),
    endAt: formatISO(schedule.end_at),
    durationMinutes: schedule.durationMinutes,
    status: getEffectiveStatus(schedule, now)
  };

  const targetTotal = schedule.target_choice_questions + schedule.target_essay_questions;

  // 2. Get Participants & Latest Attempts
  // Using subquery to find latest attempt per participant
  const [participants] = await pool.query(`
    SELECT 
      cep.id AS participantId,
      cep.participant_status,
      stu.id AS studentId,
      stu.full_name AS studentName,
      stu.nis,
      c.name AS className,
      att.id AS attempt_id,
      att.status AS attempt_status,
      att.attempt_number,
      att.started_at,
      att.expires_at,
      att.last_activity_at
    FROM cbt_exam_participants cep
    JOIN students stu ON cep.student_id = stu.id
    LEFT JOIN academic_years ay ON ay.is_active = 1
    LEFT JOIN student_class_history sch ON stu.id = sch.student_id AND sch.academic_year_id = ay.id
    LEFT JOIN classes c ON sch.class_id = c.id
    LEFT JOIN cbt_attempts att ON att.id = (
      SELECT id FROM cbt_attempts 
      WHERE participant_id = cep.id 
      ORDER BY attempt_number DESC LIMIT 1
    )
    WHERE cep.schedule_id = ? AND cep.is_eligible = 1
    ORDER BY stu.full_name ASC
  `, [scheduleId]);

  const attemptIds = participants.filter(p => p.attempt_id).map(p => p.attempt_id);
  
  // 3. Get Answers Aggregates
  const answersMap = {};
  if (attemptIds.length > 0) {
    const [aggregates] = await pool.query(`
      SELECT 
        a.attempt_id,
        COUNT(CASE WHEN q.question_type = 'SINGLE_CHOICE' AND ac.id IS NOT NULL THEN 1
                   WHEN q.question_type = 'ESSAY' AND a.answer_text IS NOT NULL AND TRIM(a.answer_text) != '' THEN 1
                   ELSE NULL END) as answered_count
      FROM cbt_answers a
      JOIN cbt_exam_questions q ON a.exam_question_id = q.id
      LEFT JOIN cbt_answer_choices ac ON a.id = ac.answer_id
      WHERE a.attempt_id IN (?)
      GROUP BY a.attempt_id
    `, [attemptIds]);
    
    aggregates.forEach(agg => {
      answersMap[agg.attempt_id] = agg.answered_count;
    });
  }

  // 4. Assemble Result
  const summary = {
    total: participants.length,
    notStarted: 0,
    inProgress: 0,
    submitted: 0,
    timeExpired: 0,
    stale: 0,
    blocked: 0
  };

  const participantDataList = participants.map(p => {
    const effectiveStatus = getEffectiveParticipantStatus(p, now, staleMinutes);
    let isStale = false;
    let remainingSeconds = 0;

    if (effectiveStatus === 'IN_PROGRESS' && p.last_activity_at) {
      const lastActivity = new Date(p.last_activity_at);
      const diffMinutes = (now - lastActivity) / 60000;
      if (diffMinutes > staleMinutes) {
        isStale = true;
      }
      
      const expiresAt = new Date(p.expires_at);
      remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
    }

    // Increment summaries
    if (effectiveStatus === 'NOT_STARTED') summary.notStarted++;
    else if (effectiveStatus === 'IN_PROGRESS') summary.inProgress++;
    else if (effectiveStatus === 'SUBMITTED') summary.submitted++;
    else if (effectiveStatus === 'TIME_EXPIRED') summary.timeExpired++;
    else if (effectiveStatus === 'BLOCKED') summary.blocked++;

    if (isStale) summary.stale++;

    const answeredCount = answersMap[p.attempt_id] || 0;
    const progressPercentage = targetTotal > 0 ? Math.round((answeredCount / targetTotal) * 100) : 0;

    return {
      participantId: p.participantId,
      student: {
        id: p.studentId,
        name: p.studentName,
        nis: p.nis,
        className: p.className
      },
      status: effectiveStatus,
      isStale,
      remainingSeconds,
      attempt: p.attempt_id ? {
        id: p.attempt_id,
        attemptNumber: p.attempt_number,
        startedAt: formatISO(p.started_at),
        expiresAt: formatISO(p.expires_at),
        lastActivityAt: formatISO(p.last_activity_at)
      } : null,
      progress: {
        answered: answeredCount,
        unanswered: targetTotal - answeredCount,
        total: targetTotal,
        percentage: progressPercentage
      }
    };
  });

  return {
    schedule: scheduleData,
    summary,
    participants: participantDataList
  };
}

export async function getMonitoringParticipantDetail(scheduleId, participantId, userId = null) {
  const params = [scheduleId, participantId];
  if (userId !== null) {
    params.push(userId);
  }

  // 1. Verify access and get basic info
  const [rows] = await pool.query(`
    SELECT 
      cep.id AS participantId,
      att.id AS attempt_id,
      cea.target_choice_questions,
      cea.target_essay_questions
    FROM cbt_exam_participants cep
    JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
    JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
    LEFT JOIN cbt_attempts att ON att.id = (
      SELECT id FROM cbt_attempts 
      WHERE participant_id = cep.id 
      ORDER BY attempt_number DESC LIMIT 1
    )
    ${userId !== null ? 'JOIN teachers t ON cea.teacher_id = t.id' : ''}
    WHERE ces.id = ? AND cep.id = ? ${userId !== null ? 'AND t.user_id = ?' : ''}
  `, params);

  if (rows.length === 0) {
    throw { status: 404, message: 'Peserta tidak ditemukan atau Anda tidak memiliki akses.' };
  }

  const participant = rows[0];
  if (!participant.attempt_id) {
    return { questions: [] }; // Not started yet
  }

  // 2. Load questions logic (similar to student get questions but read only)
  // We need to return question grid status. Since it's random, we can recreate the random grid 
  // or simply return the questions ordered by their random order if we recreate the LCG.
  // Wait, monitoring doesn't need strict matching of student's random order, but it's nice.
  // Actually, we can just return the answers joined with questions.
  
  const [answers] = await pool.query(`
    SELECT 
      a.id AS answer_id,
      a.exam_question_id,
      a.is_flagged,
      q.question_type,
      (CASE 
        WHEN q.question_type = 'SINGLE_CHOICE' AND ac.id IS NOT NULL THEN 1
        WHEN q.question_type = 'ESSAY' AND a.answer_text IS NOT NULL AND TRIM(a.answer_text) != '' THEN 1
        ELSE 0 
      END) AS is_answered
    FROM cbt_answers a
    JOIN cbt_exam_questions q ON a.exam_question_id = q.id
    LEFT JOIN cbt_answer_choices ac ON a.id = ac.answer_id
    WHERE a.attempt_id = ?
    ORDER BY a.id ASC
  `, [participant.attempt_id]);

  const questions = answers.map((ans, idx) => ({
    questionId: ans.exam_question_id,
    number: idx + 1,
    answered: ans.is_answered === 1,
    flagged: ans.is_flagged === 1
  }));

  return { questions };
}

export async function resetParticipantTime(scheduleId, participantId, userId = null) {
  const params = [scheduleId, participantId];
  if (userId !== null) {
    params.push(userId);
  }

  // 1. Verify access and get attempt info
  const [rows] = await pool.query(`
    SELECT 
      cep.id AS participantId,
      att.id AS attempt_id,
      att.status AS attempt_status,
      COALESCE(ces.duration_minutes, ce.duration_minutes) AS durationMinutes
    FROM cbt_exam_participants cep
    JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
    JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
    JOIN cbt_exams ce ON cea.exam_id = ce.id
    LEFT JOIN cbt_attempts att ON att.id = (
      SELECT id FROM cbt_attempts 
      WHERE participant_id = cep.id 
      ORDER BY attempt_number DESC LIMIT 1
    )
    ${userId !== null ? 'JOIN teachers t ON cea.teacher_id = t.id' : ''}
    WHERE ces.id = ? AND cep.id = ? ${userId !== null ? 'AND t.user_id = ?' : ''}
  `, params);

  if (rows.length === 0) {
    throw { status: 404, message: 'Peserta tidak ditemukan atau Anda tidak memiliki akses.' };
  }

  const participant = rows[0];
  if (!participant.attempt_id) {
    throw { status: 400, message: 'Peserta belum memulai ujian.' };
  }

  // Update expires_at and status
  const duration = participant.durationMinutes || 120; // fallback 120 min
  await pool.query(`
    UPDATE cbt_attempts 
    SET expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
        status = 'IN_PROGRESS'
    WHERE id = ?
  `, [duration, participant.attempt_id]);

  return { message: 'Waktu ujian berhasil direset.' };
}

export async function toggleParticipantPause(scheduleId, participantId, userId = null) {
  const params = [scheduleId, participantId];
  if (userId !== null) {
    params.push(userId);
  }

  const [rows] = await pool.query(`
    SELECT 
      cep.id AS participantId,
      att.id AS attempt_id,
      att.status AS attempt_status,
      att.expires_at,
      att.last_activity_at
    FROM cbt_exam_participants cep
    JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
    LEFT JOIN cbt_attempts att ON att.id = (
      SELECT id FROM cbt_attempts 
      WHERE participant_id = cep.id 
      ORDER BY attempt_number DESC LIMIT 1
    )
    ${userId !== null ? 'JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id JOIN teachers t ON cea.teacher_id = t.id' : ''}
    WHERE ces.id = ? AND cep.id = ? ${userId !== null ? 'AND t.user_id = ?' : ''}
  `, params);

  if (rows.length === 0) {
    throw { status: 404, message: 'Peserta tidak ditemukan atau Anda tidak memiliki akses.' };
  }

  const participant = rows[0];
  if (!participant.attempt_id) {
    throw { status: 400, message: 'Peserta belum memulai ujian.' };
  }

  if (participant.attempt_status === 'IN_PROGRESS') {
    // Pause it
    await pool.query(`
      UPDATE cbt_attempts 
      SET status = 'PAUSED', last_activity_at = NOW()
      WHERE id = ?
    `, [participant.attempt_id]);
    return { message: 'Waktu ujian berhasil dipause.' };
  } else if (participant.attempt_status === 'PAUSED') {
    // Resume it
    // Increase expires_at by the time elapsed since last_activity_at (which is when it was paused)
    await pool.query(`
      UPDATE cbt_attempts 
      SET expires_at = DATE_ADD(expires_at, INTERVAL TIMESTAMPDIFF(SECOND, last_activity_at, NOW()) SECOND),
          status = 'IN_PROGRESS',
          last_activity_at = NOW()
      WHERE id = ?
    `, [participant.attempt_id]);
    return { message: 'Waktu ujian berhasil dilanjutkan (resume).' };
  } else {
    throw { status: 400, message: 'Tidak dapat melakukan pause/resume pada status ujian ini.' };
  }
}
