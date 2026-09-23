import bcrypt from 'bcryptjs'
import * as repo from '../repositories/student-account.repository.js'
import { generateEduPassword } from '../utils/password-generator.js'

export async function getStudentAccounts(filters) {
  return await repo.getStudentAccounts(filters)
}

async function generateUsername(student) {
  if (student.nis) {
    const username = String(student.nis).trim()
    const existing = await repo.getAccountByUsername(username)
    if (!existing) return username
  }
  
  // Fallback if NIS doesn't exist or is duplicated (unlikely but possible)
  let username = `STU${student.id}`
  let counter = 1
  while (await repo.getAccountByUsername(username)) {
    username = `STU${student.id}${counter}`
    counter++
  }
  return username
}

export async function generateAccounts(payload, userId) {
  const generated = []
  const skipped = []
  
  let targetStudents = []
  
  if (payload.studentIds && payload.studentIds.length > 0) {
    for (const id of payload.studentIds) {
      const student = await repo.getStudentById(id)
      if (student) targetStudents.push(student)
    }
  } else if (payload.classId) {
    targetStudents = await repo.getStudentsByClassId(payload.classId)
  }
  
  if (targetStudents.length === 0) {
    // If no studentIds or classId specified, we don't automatically generate for ALL unless explicitly handled.
    // The requirement says "Semua siswa belum memiliki akun", the UI will pass studentIds for all students.
    // We will assume frontend sends studentIds.
  }
  
  for (const student of targetStudents) {
    const existingAccount = await repo.getAccountByStudentId(student.id)
    if (existingAccount) {
      skipped.push({
        studentId: student.id,
        name: student.full_name,
        reason: 'Akun sudah tersedia'
      })
      continue
    }
    
    const plainPassword = generateEduPassword()
    const passwordHash = await bcrypt.hash(plainPassword, 10)
    const username = await generateUsername(student)
    
    await repo.createAccount({
      studentId: student.id,
      username,
      passwordHash
    }, userId)
    
    generated.push({
      studentId: student.id,
      name: student.full_name,
      username,
      password: plainPassword
    })
  }
  
  return { generated, skipped }
}

export async function resetPassword(studentId) {
  const account = await repo.getAccountByStudentId(studentId)
  if (!account) {
    throw { status: 404, message: 'Akun CBT siswa belum dibuat.' }
  }
  
  const student = await repo.getStudentById(studentId)
  if (!student) {
    throw { status: 404, message: 'Siswa tidak ditemukan.' }
  }
  
  const plainPassword = generateEduPassword()
  const passwordHash = await bcrypt.hash(plainPassword, 10)
  
  await repo.updatePassword(studentId, passwordHash)
  
  return {
    studentId,
    username: account.username,
    password: plainPassword
  }
}

export async function updateStatus(studentId, isActive) {
  const account = await repo.getAccountByStudentId(studentId)
  if (!account) {
    throw { status: 404, message: 'Akun CBT siswa belum dibuat.' }
  }
  
  await repo.updateStatus(studentId, isActive)
  return { studentId, isActive }
}
