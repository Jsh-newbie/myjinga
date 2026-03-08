import { z } from 'zod';

import { RECORD_CATEGORIES, RECORD_SOURCES, RECORD_STATUSES } from '@/types/record';

const semesterRegex = /^\d{4}-(1|2)$/;

export const recordCategorySchema = z.enum(RECORD_CATEGORIES);
export const recordStatusSchema = z.enum(RECORD_STATUSES);
export const recordSourceSchema = z.enum(RECORD_SOURCES);

const metadataSchema = z.record(z.string(), z.unknown());

export const createRecordSchema = z
  .object({
    category: recordCategorySchema,
    semester: z.string().regex(semesterRegex, 'semester must be YYYY-1 or YYYY-2'),
    title: z.string().trim().min(1).max(120),
    content: z.string().trim().min(1).max(3000),
    careerRelevance: z.string().trim().max(1000).optional(),
    subject: z.string().trim().max(100).optional(),
    hours: z.number().min(0).max(1000).optional(),
    attachments: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
    aiDraft: z.string().trim().max(3000).optional(),
    status: recordStatusSchema.optional(),
    source: recordSourceSchema.optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
    evidenceStatus: z.enum(['none', 'hasEvidence', 'needsUpload']).optional(),
    recordDate: z.string().datetime().optional(),
    metadata: metadataSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.hours !== undefined && value.category !== 'volunteer') {
      ctx.addIssue({
        code: 'custom',
        path: ['hours'],
        message: 'hours is only allowed for volunteer records',
      });
    }
  });

export const updateRecordSchema = createRecordSchema.partial().superRefine((value, ctx) => {
  if (Object.keys(value).length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'at least one field is required',
    });
  }

  if (value.hours !== undefined && value.category !== undefined && value.category !== 'volunteer') {
    ctx.addIssue({
      code: 'custom',
      path: ['hours'],
      message: 'hours is only allowed for volunteer records',
    });
  }
});

export const listRecordsQuerySchema = z.object({
  category: recordCategorySchema.optional(),
  semester: z.string().regex(semesterRegex, 'semester must be YYYY-1 or YYYY-2').optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().min(1).optional(),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type ListRecordsQueryInput = z.infer<typeof listRecordsQuerySchema>;
