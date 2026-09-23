import * as teacherService from '../services/teacher.service.js'
import { response } from '../utils/response.js'

export async function getTeacherAssignments(req, res, next) {
  try {
    const data = await teacherService.getTeacherAssignments(req.user.sub)
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}

export async function getTeacherAssignmentById(req, res, next) {
  try {
    const data = await teacherService.getTeacherAssignmentById(req.user.sub, req.params.id)
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}
