import * as service from '../services/student-account.service.js'
import * as schema from '../schemas/student-account.schema.js'
import { response } from '../utils/response.js'

export async function getStudentAccounts(req, res, next) {
  try {
    const filters = {
      search: req.query.search,
      classId: req.query.classId ? parseInt(req.query.classId) : null,
      accountStatus: req.query.accountStatus // ALL, HAS_ACCOUNT, NO_ACCOUNT, ACTIVE, INACTIVE
    }
    const data = await service.getStudentAccounts(filters)
    response.success(res, { data: { items: data } })
  } catch (err) {
    next(err)
  }
}

export async function generateAccounts(req, res, next) {
  try {
    const validatedData = schema.generateAccountsSchema.parse(req.body)
    const data = await service.generateAccounts(validatedData, req.user.sub)
    response.success(res, { message: 'Berhasil memproses pembuatan akun.', data })
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId)
    const data = await service.resetPassword(studentId)
    response.success(res, { message: 'Password berhasil direset.', data })
  } catch (err) {
    next(err)
  }
}

export async function updateStatus(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId)
    const validatedData = schema.updateStatusSchema.parse(req.body)
    const data = await service.updateStatus(studentId, validatedData.isActive)
    response.success(res, { message: 'Status akun berhasil diperbarui.', data })
  } catch (err) {
    next(err)
  }
}
