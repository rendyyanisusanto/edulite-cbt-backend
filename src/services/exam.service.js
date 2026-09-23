import * as examRepo from '../repositories/exam.repository.js'

export async function getAllExams() {
  return await examRepo.getAllExams()
}

export async function getExamById(id) {
  const exam = await examRepo.getExamById(id)
  if (!exam) throw { status: 404, message: 'Exam not found' }
  
  // Later we can add assignments count here
  return exam
}

export async function createExam(examData, userId) {
  if (await examRepo.checkCodeExists(examData.code)) {
    throw { status: 409, message: 'Kode ujian sudah digunakan' }
  }
  
  const insertId = await examRepo.createExam(examData, userId)
  return await examRepo.getExamById(insertId)
}

export async function updateExam(id, examData, userId) {
  const exam = await examRepo.getExamById(id)
  if (!exam) throw { status: 404, message: 'Exam not found' }
  
  if (await examRepo.checkCodeExists(examData.code, id)) {
    throw { status: 409, message: 'Kode ujian sudah digunakan' }
  }
  
  await examRepo.updateExam(id, examData, userId)
  return await examRepo.getExamById(id)
}

export async function deleteExam(id, userId) {
  const exam = await examRepo.getExamById(id)
  if (!exam) throw { status: 404, message: 'Exam not found' }
  
  await examRepo.deleteExam(id, userId)
}
