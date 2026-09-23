import * as assignmentRepo from '../repositories/assignment.repository.js'

function enrichAssignment(assignment) {
  if (!assignment) return null
  
  let status = 'NOT_STARTED'
  const targetsMet = (assignment.choiceCount >= assignment.targetChoiceQuestions) && 
                     (assignment.essayCount >= assignment.targetEssayQuestions)
  const totalTargets = assignment.targetChoiceQuestions + assignment.targetEssayQuestions
  
  if (totalTargets > 0 && targetsMet) {
    status = 'READY'
  } else if (assignment.choiceCount > 0 || assignment.essayCount > 0) {
    status = 'IN_PROGRESS'
  }
  
  return { ...assignment, status }
}

export async function getAllAssignments() {
  const assignments = await assignmentRepo.getAllAssignments()
  return assignments.map(enrichAssignment)
}

export async function getAssignmentsByExamId(examId) {
  const assignments = await assignmentRepo.getAssignmentsByExamId(examId)
  return assignments.map(enrichAssignment)
}

export async function getAssignmentById(id) {
  const assignment = await assignmentRepo.getAssignmentById(id)
  if (!assignment) throw { status: 404, message: 'Assignment not found' }
  return enrichAssignment(assignment)
}

export async function createAssignment(examId, data, userId) {
  if (await assignmentRepo.checkUniqueAssignment(examId, data.teacherId, data.subjectId, data.classId)) {
    throw { status: 409, message: 'Penugasan untuk guru, mapel, dan kelas ini sudah ada pada ujian ini' }
  }
  
  const insertId = await assignmentRepo.createAssignment(examId, data, userId)
  return await getAssignmentById(insertId)
}

export async function updateAssignment(id, data, userId) {
  const assignment = await assignmentRepo.getAssignmentById(id)
  if (!assignment) throw { status: 404, message: 'Assignment not found' }
  
  if (await assignmentRepo.checkUniqueAssignment(assignment.examId, data.teacherId, data.subjectId, data.classId, id)) {
    throw { status: 409, message: 'Penugasan untuk guru, mapel, dan kelas ini sudah ada pada ujian ini' }
  }
  
  await assignmentRepo.updateAssignment(id, data, userId)
  return await getAssignmentById(id)
}

export async function deleteAssignment(id) {
  const assignment = await assignmentRepo.getAssignmentById(id)
  if (!assignment) throw { status: 404, message: 'Assignment not found' }
  
  await assignmentRepo.deleteAssignment(id)
}
