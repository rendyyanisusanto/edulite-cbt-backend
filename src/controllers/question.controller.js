import * as questionService from '../services/question.service.js'
import { response } from '../utils/response.js'

export async function getQuestionsByAssignmentId(req, res, next) {
  try {
    const data = await questionService.getQuestionsByAssignmentId(req.user.sub, req.params.assignmentId)
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}

export async function getQuestionById(req, res, next) {
  try {
    const data = await questionService.getQuestionById(req.user.sub, req.params.id)
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}

export async function createQuestion(req, res, next) {
  try {
    const data = await questionService.createQuestion(req.user.sub, req.params.assignmentId, req.body)
    response.success(res, { statusCode: 201, message: 'Soal berhasil ditambahkan', data })
  } catch (err) {
    next(err)
  }
}

export async function updateQuestion(req, res, next) {
  try {
    const data = await questionService.updateQuestion(req.user.sub, req.params.id, req.body)
    response.success(res, { message: 'Soal berhasil diperbarui', data })
  } catch (err) {
    next(err)
  }
}

export async function deleteQuestion(req, res, next) {
  try {
    await questionService.deleteQuestion(req.user.sub, req.params.id)
    response.success(res, { message: 'Soal berhasil dihapus' })
  } catch (err) {
    next(err)
  }
}

export async function duplicateQuestion(req, res, next) {
  try {
    const data = await questionService.duplicateQuestion(req.user.sub, req.params.id)
    response.success(res, { statusCode: 201, message: 'Soal berhasil diduplikasi', data })
  } catch(err) {
    next(err)
  }
}

export async function cloneQuestions(req, res, next) {
  try {
    const { sourceAssignmentId } = req.body
    if (!sourceAssignmentId) {
      throw { status: 400, message: 'sourceAssignmentId is required' }
    }
    const data = await questionService.cloneQuestions(req.user.sub, req.params.assignmentId, sourceAssignmentId)
    response.success(res, { statusCode: 201, message: 'Soal berhasil dikloning', data })
  } catch(err) {
    next(err)
  }
}
