import { z } from 'zod'

export const generateAccountsSchema = z.object({
  studentIds: z.array(z.number()).optional(),
  classId: z.number().optional()
}).refine(data => data.studentIds || data.classId, {
  message: 'Harus menyertakan studentIds atau classId'
})

export const updateStatusSchema = z.object({
  isActive: z.boolean()
})
