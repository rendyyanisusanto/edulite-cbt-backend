import * as questionRepo from '../repositories/question.repository.js'
import * as teacherRepo from '../repositories/teacher.repository.js'

function validateQuestion(data) {
  if (!data.questionText) throw { status: 400, message: 'Pertanyaan tidak boleh kosong' }
  if (!data.score || data.score <= 0) throw { status: 400, message: 'Bobot soal harus lebih dari 0' }
  if (data.questionType !== 'SINGLE_CHOICE' && data.questionType !== 'ESSAY') {
    throw { status: 422, message: 'Tipe soal tidak valid' }
  }

  if (data.questionType === 'SINGLE_CHOICE') {
    if (!data.options || data.options.length !== 5) {
      throw { status: 400, message: 'Pilihan ganda harus memiliki 5 opsi (A-E)' }
    }
    const correctCount = data.options.filter(opt => opt.isCorrect).length
    if (correctCount !== 1) {
      throw { status: 400, message: 'Harus ada tepat satu jawaban benar' }
    }
  }
}

async function verifyOwnershipByAssignment(userId, assignmentId) {
  const assignment = await teacherRepo.getTeacherAssignmentById(userId, assignmentId)
  if (!assignment) throw { status: 403, message: 'Akses ditolak. Assignment bukan milik Anda.' }
}

export async function getQuestionsByAssignmentId(userId, assignmentId) {
  await verifyOwnershipByAssignment(userId, assignmentId)
  return await questionRepo.getQuestionsByAssignmentId(assignmentId)
}

export async function getQuestionById(userId, id) {
  const question = await questionRepo.getQuestionById(id)
  if (!question) throw { status: 404, message: 'Question not found' }
  await verifyOwnershipByAssignment(userId, question.assignmentId)
  return question
}

export async function createQuestion(userId, assignmentId, data) {
  await verifyOwnershipByAssignment(userId, assignmentId)
  validateQuestion(data)
  const insertId = await questionRepo.createQuestion(assignmentId, data)
  return await getQuestionById(userId, insertId)
}

export async function updateQuestion(userId, id, data) {
  const question = await getQuestionById(userId, id)
  // Ensure we validate with merged data or entirely new data
  const updatedData = { ...question, ...data }
  validateQuestion(updatedData)
  
  await questionRepo.updateQuestion(id, updatedData)
  return await getQuestionById(userId, id)
}

export async function deleteQuestion(userId, id) {
  await getQuestionById(userId, id) // verifies ownership
  await questionRepo.deleteQuestion(id)
}

export async function duplicateQuestion(userId, id) {
  await getQuestionById(userId, id) // verifies ownership
  const newId = await questionRepo.duplicateQuestion(id)
  return await getQuestionById(userId, newId)
}

export async function cloneQuestions(userId, targetAssignmentId, sourceAssignmentId) {
  await verifyOwnershipByAssignment(userId, targetAssignmentId)
  await verifyOwnershipByAssignment(userId, sourceAssignmentId)
  await questionRepo.cloneQuestions(targetAssignmentId, sourceAssignmentId)
  return await getQuestionsByAssignmentId(userId, targetAssignmentId)
}
