import { pool } from '../config/database.js';

/**
 * Auto grade objective questions for an attempt.
 */
export async function autoGradeObjective(attemptId) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock attempt
    await connection.query(`SELECT id FROM cbt_attempts WHERE id = ? FOR UPDATE`, [attemptId]);

    // Fetch all SINGLE_CHOICE answers for this attempt
    const [answers] = await connection.query(`
      SELECT 
        ans.id AS answerId,
        ans.exam_question_id,
        q.score AS question_score,
        ch.exam_question_option_id
      FROM cbt_answers ans
      JOIN cbt_exam_questions q ON ans.exam_question_id = q.id
      LEFT JOIN cbt_answer_choices ch ON ans.id = ch.answer_id
      WHERE ans.attempt_id = ? AND q.question_type = 'SINGLE_CHOICE'
    `, [attemptId]);

    if (answers.length > 0) {
      // Fetch options to check correctness
      const optionIds = answers.map(a => a.exam_question_option_id).filter(id => id);
      
      let optionsMap = {};
      if (optionIds.length > 0) {
        const [options] = await connection.query(`
          SELECT id, is_correct FROM cbt_exam_question_options WHERE id IN (?)
        `, [optionIds]);
        options.forEach(opt => {
          optionsMap[opt.id] = opt.is_correct == 1 || opt.is_correct === true || (Buffer.isBuffer(opt.is_correct) && opt.is_correct[0] === 1);
        });
      }

      for (const ans of answers) {
        let isCorrect = 0;
        let scoreAwarded = 0;
        
        if (ans.exam_question_option_id && optionsMap[ans.exam_question_option_id]) {
          isCorrect = 1;
          scoreAwarded = Number(ans.question_score || 0);
        }

        await connection.query(`
          UPDATE cbt_answers 
          SET is_correct = ?, score_awarded = ?, grading_status = 'AUTO_GRADED' 
          WHERE id = ?
        `, [isCorrect, scoreAwarded, ans.answerId]);
      }
    }

    // Now recalculate scores within the same transaction to prevent dirty reads
    await recalculateAttemptScoreInternal(attemptId, connection);

    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error in autoGradeObjective:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Recalculate the overall score for an attempt.
 */
export async function recalculateAttemptScore(attemptId) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await recalculateAttemptScoreInternal(attemptId, connection);
    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error in recalculateAttemptScore:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function recalculateAttemptScoreInternal(attemptId, connection) {
  // Lock attempt
  const [attempts] = await connection.query(`SELECT participant_id FROM cbt_attempts WHERE id = ? FOR UPDATE`, [attemptId]);
  if (attempts.length === 0) return;
  const participantId = attempts[0].participant_id;

  // Get Assignment configuration for target targets
  // Wait, the maximum score should be based on the assignment target or the actual answered questions?
  // Actually, maximum points = SUM(score of all exam questions assigned).
  // If shuffle_questions/target_choice_questions limits the questions, how do we know which questions were served?
  // The system currently assigns questions dynamically based on random seed.
  // We can calculate maximum points by querying cbt_answers since answers are generated for questions.
  // Wait, what if a student didn't answer some questions? They won't be in cbt_answers!
  // To get the true max, we should reproduce the target logic, OR we can pre-generate answers with NULL values when attempt starts.
  // The current codebase does NOT pre-generate answers.
  
  // Let's get the max score from the questions that were generated for this student.
  // We can get the randomization_seed and assignment targets to re-run the question selection.
  const [verifyRows] = await connection.query(`
    SELECT 
      att.randomization_seed,
      cea.id AS assignmentId,
      cea.shuffle_questions,
      cea.target_choice_questions,
      cea.target_essay_questions
    FROM cbt_attempts att
    JOIN cbt_exam_participants cep ON att.participant_id = cep.id
    JOIN cbt_exam_schedules ces ON cep.schedule_id = ces.id
    JOIN cbt_exam_assignments cea ON ces.exam_assignment_id = cea.id
    WHERE att.id = ?
  `, [attemptId]);
  
  const { randomization_seed, assignmentId, shuffle_questions, target_choice_questions, target_essay_questions } = verifyRows[0];
  
  const [questions] = await connection.query(`
    SELECT id, question_type, score
    FROM cbt_exam_questions
    WHERE exam_assignment_id = ?
  `, [assignmentId]);
  
  // Seed logic same as in attempt route
  class LCG {
    constructor(seedString) {
      let hash = 0;
      for (let i = 0; i < seedString.length; i++) {
        hash = (Math.imul(31, hash) + seedString.charCodeAt(i)) | 0;
      }
      this.seed = Math.abs(hash);
    }
    next() {
      this.seed = (this.seed * 9301 + 49297) % 233280;
      return Math.abs(this.seed) / 233280;
    }
  }
  const shuffleArray = (array, seedString) => {
    const rng = new LCG(seedString);
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  
  let choiceQuestions = questions.filter(q => q.question_type === 'SINGLE_CHOICE');
  let essayQuestions = questions.filter(q => q.question_type === 'ESSAY');

  if (shuffle_questions) {
    choiceQuestions = shuffleArray(choiceQuestions, randomization_seed + ":choice_questions");
    essayQuestions = shuffleArray(essayQuestions, randomization_seed + ":essay_questions");
  } else {
    choiceQuestions.sort((a, b) => a.id - b.id);
    essayQuestions.sort((a, b) => a.id - b.id);
  }
  
  choiceQuestions = choiceQuestions.slice(0, target_choice_questions);
  essayQuestions = essayQuestions.slice(0, target_essay_questions);
  
  const selectedQuestions = [...choiceQuestions, ...essayQuestions];
  let maximumPoints = 0;
  for (const q of selectedQuestions) {
    maximumPoints += Number(q.score || 0);
  }
  
  // Now sum up answers
  const [answers] = await connection.query(`
    SELECT 
      ans.id,
      ans.exam_question_id,
      q.question_type,
      ans.is_correct,
      ans.score_awarded,
      ans.grading_status,
      ch.exam_question_option_id,
      ans.answer_text
    FROM cbt_answers ans
    JOIN cbt_exam_questions q ON ans.exam_question_id = q.id
    LEFT JOIN cbt_answer_choices ch ON ans.id = ch.answer_id
    WHERE ans.attempt_id = ?
  `, [attemptId]);

  let objectivePoints = 0;
  let essayPoints = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  for (const q of choiceQuestions) {
    const ans = answers.find(a => a.exam_question_id === q.id);
    if (!ans || !ans.exam_question_option_id) {
      unansweredCount++;
    } else {
      if (ans.is_correct == 1 || ans.is_correct === true || (Buffer.isBuffer(ans.is_correct) && ans.is_correct[0] === 1)) {
        correctCount++;
        objectivePoints += Number(ans.score_awarded || 0);
      } else {
        wrongCount++;
      }
    }
  }
  
  // Wait, what if there are essay answers?
  let pendingEssays = 0;
  for (const q of essayQuestions) {
    const ans = answers.find(a => a.exam_question_id === q.id);
    if (!ans || (!ans.answer_text && !ans.score_awarded)) {
      // not answered
    } else if (ans.grading_status === 'PENDING') {
      pendingEssays++;
    } else if (ans.grading_status === 'MANUALLY_GRADED') {
      essayPoints += Number(ans.score_awarded || 0);
    }
  }

  const earnedPoints = objectivePoints + essayPoints;
  const finalScore = maximumPoints > 0 ? (earnedPoints / maximumPoints) * 100 : 0;
  
  await connection.query(`
    UPDATE cbt_attempts 
    SET 
      objective_points = ?,
      essay_points = ?,
      earned_points = ?,
      maximum_points = ?,
      final_score = ?,
      correct_count = ?,
      wrong_count = ?,
      unanswered_count = ?
    WHERE id = ?
  `, [
    objectivePoints, essayPoints, earnedPoints, maximumPoints, 
    parseFloat(finalScore.toFixed(2)), 
    correctCount, wrongCount, unansweredCount, attemptId
  ]);
}
