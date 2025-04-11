import { z } from 'zod'

export const singUpSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  stake: z.string().nonempty('Stake is required'),
  ward: z.string().nonempty('Ward is required'),  
  password: z.string().min(8),
  profilePicture: z.string().optional(),
})

export const singInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
