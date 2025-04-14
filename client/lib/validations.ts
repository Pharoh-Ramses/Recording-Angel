import { z } from 'zod'

export const signUpSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  stake: z.number().nonnegative().int().refine(value => value !== undefined, { message: 'Stake is required' }),
  ward: z.number().nonnegative().int().refine(value => value !== undefined, { message: 'Ward is required' }),
  password: z.string().min(8),
  profilePicture: z.string().optional(),
})

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
