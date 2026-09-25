import { pool } from '../config/database.js'

export async function getQuestionsByAssignmentId(assignmentId) {
  const [questions] = await pool.execute(`
    SELECT q.*
    FROM cbt_exam_questions q
    WHERE q.exam_assignment_id = ?
    ORDER BY q.sort_order ASC, q.id ASC
  `, [assignmentId])

  const [options] = await pool.execute(`
    SELECT o.* 
    FROM cbt_exam_question_options o
    JOIN cbt_exam_questions q ON o.exam_question_id = q.id
    WHERE q.exam_assignment_id = ?
    ORDER BY o.sort_order ASC, o.id ASC
  `, [assignmentId])

  // Map options to questions
  const optionsMap = {}
  for (const opt of options) {
    if (!optionsMap[opt.exam_question_id]) {
      optionsMap[opt.exam_question_id] = []
    }
    optionsMap[opt.exam_question_id].push(opt)
  }

  return questions.map(q => ({
    id: Number(q.id),
    assignmentId: Number(q.exam_assignment_id),
    questionType: q.question_type,
    questionText: q.question_text,
    mediaUrl: q.media_url,
    answerKey: typeof q.answer_key === 'string' ? JSON.parse(q.answer_key) : q.answer_key,
    explanation: q.explanation,
    score: Number(q.score),
    sortOrder: q.sort_order,
    options: (optionsMap[q.id] || []).map(opt => ({
      id: opt.id,
      key: opt.option_key,
      text: opt.option_text,
      mediaUrl: opt.media_url,
      isCorrect: !!opt.is_correct
    }))
  }))
}

export async function getQuestionById(id) {
  const [questions] = await pool.execute(`
    SELECT * FROM cbt_exam_questions WHERE id = ?
  `, [id])

  if (questions.length === 0) return null

  const q = questions[0]
  let mappedOptions = []
  
  if (q.question_type === 'SINGLE_CHOICE') {
    const [options] = await pool.execute(`
      SELECT * FROM cbt_exam_question_options WHERE exam_question_id = ? ORDER BY sort_order ASC
    `, [id])
    
    mappedOptions = options.map(opt => ({
      id: opt.id,
      key: opt.option_key,
      text: opt.option_text,
      mediaUrl: opt.media_url,
      isCorrect: !!opt.is_correct
    }))
  }

  return {
    id: Number(q.id),
    assignmentId: Number(q.exam_assignment_id),
    questionType: q.question_type,
    questionText: q.question_text,
    mediaUrl: q.media_url,
    answerKey: typeof q.answer_key === 'string' ? JSON.parse(q.answer_key) : q.answer_key,
    explanation: q.explanation,
    score: Number(q.score),
    sortOrder: q.sort_order,
    options: mappedOptions
  }
}

export async function createQuestion(assignmentId, data) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { 
      questionType, 
      questionText, 
      mediaUrl = null,
      answerKey = null,
      explanation = null,
      score = 1.0,
      options = []
    } = data

    // Get max sort_order
    const [rows] = await connection.execute(
      'SELECT MAX(sort_order) as maxOrder FROM cbt_exam_questions WHERE exam_assignment_id = ?', 
      [assignmentId]
    )
    const sortOrder = (rows[0].maxOrder || 0) + 1

    const [qResult] = await connection.execute(`
      INSERT INTO cbt_exam_questions (
        exam_assignment_id, question_type, question_text, media_url, 
        answer_key, explanation, score, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assignmentId, 
      questionType, 
      questionText, 
      mediaUrl, 
      answerKey ? JSON.stringify(answerKey) : null,
      explanation,
      score,
      sortOrder
    ])
    
    const questionId = qResult.insertId

    if (questionType === 'SINGLE_CHOICE' && options.length > 0) {
      let optOrder = 1
      for (const opt of options) {
        await connection.execute(`
          INSERT INTO cbt_exam_question_options (
            exam_question_id, option_key, option_text, media_url, is_correct, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [questionId, opt.key || String.fromCharCode(64 + optOrder), opt.text, opt.mediaUrl || null, opt.isCorrect ? 1 : 0, optOrder])
        optOrder++
      }
    }

    await connection.commit()
    return questionId
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

export async function updateQuestion(id, data) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { 
      questionType, 
      questionText, 
      mediaUrl = null,
      answerKey = null,
      explanation = null,
      score,
      options = []
    } = data

    await connection.execute(`
      UPDATE cbt_exam_questions SET 
        question_type = ?, question_text = ?, media_url = ?, 
        answer_key = ?, explanation = ?, score = ?
      WHERE id = ?
    `, [questionType, questionText, mediaUrl, answerKey ? JSON.stringify(answerKey) : null, explanation, score, id])

    if (questionType === 'SINGLE_CHOICE') {
      // Delete existing options
      await connection.execute('DELETE FROM cbt_exam_question_options WHERE exam_question_id = ?', [id])
      
      // Insert new options
      let optOrder = 1
      for (const opt of options) {
        await connection.execute(`
          INSERT INTO cbt_exam_question_options (
            exam_question_id, option_key, option_text, media_url, is_correct, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [id, opt.key || String.fromCharCode(64 + optOrder), opt.text, opt.mediaUrl || null, opt.isCorrect ? 1 : 0, optOrder])
        optOrder++
      }
    } else {
      // Delete options if type changed to essay
      await connection.execute('DELETE FROM cbt_exam_question_options WHERE exam_question_id = ?', [id])
    }

    await connection.commit()
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

export async function deleteQuestion(id) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.execute('DELETE FROM cbt_exam_question_options WHERE exam_question_id = ?', [id])
    await connection.execute('DELETE FROM cbt_exam_questions WHERE id = ?', [id])
    await connection.commit()
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

export async function duplicateQuestion(id) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    
    // get existing
    const [questions] = await connection.execute('SELECT * FROM cbt_exam_questions WHERE id = ?', [id])
    if(questions.length === 0) throw new Error('Question not found')
    const q = questions[0]
  
    // get max order
    const [rows] = await connection.execute(
      'SELECT MAX(sort_order) as maxOrder FROM cbt_exam_questions WHERE exam_assignment_id = ?', 
      [q.exam_assignment_id]
    )
    const sortOrder = (rows[0].maxOrder || 0) + 1
    
    // insert duplicate question
    const [qResult] = await connection.execute(`
      INSERT INTO cbt_exam_questions (
        exam_assignment_id, question_type, question_text, media_url, 
        answer_key, explanation, score, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      q.exam_assignment_id, q.question_type, q.question_text, q.media_url, 
      q.answer_key, q.explanation, q.score, sortOrder
    ])
    
    const newId = qResult.insertId
    
    // duplicate options
    if (q.question_type === 'SINGLE_CHOICE') {
      const [options] = await connection.execute('SELECT * FROM cbt_exam_question_options WHERE exam_question_id = ? ORDER BY sort_order ASC', [id])
      for(const opt of options) {
        await connection.execute(`
          INSERT INTO cbt_exam_question_options (
            exam_question_id, option_key, option_text, media_url, is_correct, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [newId, opt.option_key, opt.option_text, opt.media_url, opt.is_correct, opt.sort_order])
      }
    }
    
    await connection.commit()
    return newId
  } catch(err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

export async function cloneQuestions(targetAssignmentId, sourceAssignmentId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // Get max sort_order of target
    const [rows] = await connection.execute(
      'SELECT MAX(sort_order) as maxOrder FROM cbt_exam_questions WHERE exam_assignment_id = ?', 
      [targetAssignmentId]
    )
    let currentSortOrder = (rows[0].maxOrder || 0)

    // Get all questions from source
    const [sourceQuestions] = await connection.execute(
      'SELECT * FROM cbt_exam_questions WHERE exam_assignment_id = ? ORDER BY sort_order ASC, id ASC',
      [sourceAssignmentId]
    )

    for (const q of sourceQuestions) {
      currentSortOrder++

      const [qResult] = await connection.execute(`
        INSERT INTO cbt_exam_questions (
          exam_assignment_id, question_type, question_text, media_url, 
          answer_key, explanation, score, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        targetAssignmentId, q.question_type, q.question_text, q.media_url, 
        q.answer_key, q.explanation, q.score, currentSortOrder
      ])
      
      const newId = qResult.insertId

      if (q.question_type === 'SINGLE_CHOICE') {
        const [options] = await connection.execute('SELECT * FROM cbt_exam_question_options WHERE exam_question_id = ? ORDER BY sort_order ASC', [q.id])
        for(const opt of options) {
          await connection.execute(`
            INSERT INTO cbt_exam_question_options (
              exam_question_id, option_key, option_text, media_url, is_correct, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [newId, opt.option_key, opt.option_text, opt.media_url, opt.is_correct, opt.sort_order])
        }
      }
    }

    await connection.commit()
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}
