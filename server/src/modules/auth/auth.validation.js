const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['student', 'tutor'], {
      errorMap: () => ({ message: 'Role must be student or tutor' })
    }).default('student'),
    yearOfStudy: z.number().int().min(1).max(6).optional(),
    department: z.string().max(100).optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

module.exports = {
  registerSchema,
  loginSchema
};
