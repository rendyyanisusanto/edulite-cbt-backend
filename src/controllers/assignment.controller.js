import * as assignmentService from '../services/assignment.service.js'
import { response } from '../utils/response.js'

export async function getAllAssignments(req, res, next) {
  try {
    const data = await assignmentService.getAllAssignments()
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}

export async function getAssignmentsByExamId(req, res, next) {
  try {
    const data = await assignmentService.getAssignmentsByExamId(req.params.examId)
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}

export async function createAssignment(req, res, next) {
  try {
    const data = await assignmentService.createAssignment(req.params.examId, req.body, req.user.sub)
    response.success(res, { statusCode: 201, message: 'Penugasan berhasil dibuat', data })
  } catch (err) {
    next(err)
  }
}

export async function updateAssignment(req, res, next) {
  try {
    const data = await assignmentService.updateAssignment(req.params.id, req.body, req.user.sub)
    response.success(res, { message: 'Penugasan berhasil diperbarui', data })
  } catch (err) {
    next(err)
  }
}

export async function deleteAssignment(req, res, next) {
  try {
    await assignmentService.deleteAssignment(req.params.id)
    response.success(res, { message: 'Penugasan berhasil dihapus' })
  } catch (err) {
    next(err)
  }
}
