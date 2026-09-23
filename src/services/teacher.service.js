import * as teacherRepo from '../repositories/teacher.repository.js'

function enrichAssignment(assignment) {
  if (!assignment) return null
  
  const targetChoice = Number(assignment.targetChoiceQuestions) || 0
  const targetEssay = Number(assignment.targetEssayQuestions) || 0
  const choiceCount = Number(assignment.choiceCount) || 0
  const essayCount = Number(assignment.essayCount) || 0
  
  const totalTarget = targetChoice + targetEssay
  const totalCount = choiceCount + essayCount
  
  let status = 'NOT_STARTED'
  const isChoiceReady = choiceCount >= targetChoice
  const isEssayReady = targetEssay === 0 || essayCount >= targetEssay
  
  if (totalCount > 0) {
    if (isChoiceReady && isEssayReady) {
      status = 'READY'
    } else {
      status = 'IN_PROGRESS'
    }
  }
  
  const choiceProgress = targetChoice > 0 ? Math.min((choiceCount / targetChoice) * 100, 100) : 0
  const essayProgress = targetEssay > 0 ? Math.min((essayCount / targetEssay) * 100, 100) : 0
  const totalProgress = totalTarget > 0 ? Math.min((totalCount / totalTarget) * 100, 100) : 0

  return {
    id: assignment.id,
    exam: {
      id: assignment.examId,
      title: assignment.examName,
      code: assignment.examCode,
      academicYear: assignment.academicYear,
      semester: assignment.semester,
      status: assignment.examStatus
    },
    subject: {
      id: assignment.subjectId,
      name: assignment.subjectName
    },
    class: {
      id: assignment.classId,
      name: assignment.className
    },
    targetChoiceQuestions: targetChoice,
    targetEssayQuestions: targetEssay,
    choiceQuestionCount: choiceCount,
    essayQuestionCount: essayCount,
    totalQuestionCount: totalCount,
    choiceProgress,
    essayProgress,
    totalProgress,
    status,
    durationMinutes: assignment.durationMinutes
  }
}

export async function getTeacherAssignments(userId) {
  const assignments = await teacherRepo.getTeacherAssignments(userId)
  return assignments.map(enrichAssignment)
}

export async function getTeacherAssignmentById(userId, assignmentId) {
  const assignment = await teacherRepo.getTeacherAssignmentById(userId, assignmentId)
  if (!assignment) throw { status: 404, message: 'Assignment not found or you do not have permission' }
  return enrichAssignment(assignment)
}
