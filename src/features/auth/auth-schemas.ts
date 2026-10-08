import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export type SignInValues = z.infer<typeof signInSchema>

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120, 'Your name is too long.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(72, 'Use 72 characters or fewer.'),
  confirmPassword: z.string().min(1, 'Confirm your password.'),
}).refine((values) => values.password === values.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
})

export type SignUpValues = z.infer<typeof signUpSchema>

const optionalPhone = z.string().trim().refine((value) => !value || /^[+0-9()\s-]{7,25}$/.test(value), {
  message: 'Enter a valid phone number or leave this blank.',
})

export const profileCompletionSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120, 'Your name is too long.'),
  institution: z.string().trim().min(2, 'Enter your institution.').max(180, 'Your institution name is too long.'),
  phone: optionalPhone,
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced'], { required_error: 'Select your experience level.' }),
  interests: z.string().trim().max(500, 'Keep interests under 500 characters.'),
  skills: z.string().trim().max(500, 'Keep skills under 500 characters.'),
})

export type ProfileCompletionValues = z.infer<typeof profileCompletionSchema>

export function parseList(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
}

export function formatList(value: readonly string[] | null | undefined): string {
  return value?.join(', ') ?? ''
}
