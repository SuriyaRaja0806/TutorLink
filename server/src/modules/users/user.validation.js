const { z } = require('zod');

const getUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    role: z.enum(['student', 'tutor', 'admin']).optional(),
    search: z.string().optional()
  })
});

const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    yearOfStudy: z.number().int().min(1).max(6).optional(),
    department: z.string().max(100).optional(),
    avatarUrl: z.string().url().optional().or(z.literal(''))
  })
});

const updateUserStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean({ required_error: 'isActive is required' })
  })
});

module.exports = {
  getUsersQuerySchema,
  updateUserSchema,
  updateUserStatusSchema
};
