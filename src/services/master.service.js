import * as masterRepo from '../repositories/master.repository.js'

export async function getAcademicYears() {
  return await masterRepo.getAcademicYears()
}

export async function getTeachers() {
  return await masterRepo.getTeachers()
}

export async function getClasses() {
  return await masterRepo.getClasses()
}

export async function getSubjects() {
  return await masterRepo.getSubjects()
}
