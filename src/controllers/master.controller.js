import * as masterService from '../services/master.service.js'
import { response } from '../utils/response.js'

export async function getAcademicYears(req, res, next) {
  try {
    const data = await masterService.getAcademicYears()
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}

export async function getTeachers(req, res, next) {
  try {
    const data = await masterService.getTeachers()
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}

export async function getClasses(req, res, next) {
  try {
    const data = await masterService.getClasses()
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}

export async function getSubjects(req, res, next) {
  try {
    const data = await masterService.getSubjects()
    response.success(res, { data })
  } catch (err) {
    next(err)
  }
}
