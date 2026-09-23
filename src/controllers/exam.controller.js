import * as examService from '../services/exam.service.js'
import { response } from '../utils/response.js'

export async function getAllExams(req, res, next) {
  try {
    const data = await examService.getAllExams()
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}

export async function getExamById(req, res, next) {
  try {
    const data = await examService.getExamById(req.params.id)
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}

export async function createExam(req, res, next) {
  try {
    const data = await examService.createExam(req.body, req.user.sub)
    response.success(res, { statusCode: 201, message: 'Ujian berhasil dibuat', data })
  } catch (err) {
    next(err)
  }
}

export async function updateExam(req, res, next) {
  try {
    const data = await examService.updateExam(req.params.id, req.body, req.user.sub)
    response.success(res, { message: 'Ujian berhasil diperbarui', data })
  } catch (err) {
    next(err)
  }
}

export async function deleteExam(req, res, next) {
  try {
    await examService.deleteExam(req.params.id, req.user.sub)
    response.success(res, { message: 'Ujian berhasil dihapus' })
  } catch (err) {
    next(err)
  }
}
