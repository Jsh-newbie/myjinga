import { z } from 'zod';

export const insightFeedQuerySchema = z.object({
  tab: z.enum(['all', 'jobs', 'majors', 'record-linked']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  keyword: z.string().trim().min(1).max(50).optional(),
});

export const listInsightSavesQuerySchema = z.object({
  status: z.enum(['active', 'used', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const createInsightSaveSchema = z.object({
  contentId: z.string().trim().min(1).max(160),
  reactionType: z.enum(['saved', 'curious', 'explore', 'record']),
  titleSnapshot: z.string().trim().min(1).max(220),
  sourceUrlSnapshot: z.string().trim().url(),
  memo: z.string().trim().max(300).optional(),
  linkedJob: z.string().trim().max(120).optional(),
  linkedMajor: z.string().trim().max(120).optional(),
  linkedRecordId: z.string().trim().max(160).optional(),
  exploreQuestion: z.string().trim().max(200).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  status: z.enum(['active', 'used', 'archived']).optional(),
});

export const updateInsightSaveSchema = createInsightSaveSchema
  .omit({
    contentId: true,
    titleSnapshot: true,
    sourceUrlSnapshot: true,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: '수정할 값이 필요합니다.',
  });

export type InsightFeedQueryInput = z.infer<typeof insightFeedQuerySchema>;
export type ListInsightSavesQueryInput = z.infer<typeof listInsightSavesQuerySchema>;
export type CreateInsightSaveInput = z.infer<typeof createInsightSaveSchema>;
export type UpdateInsightSaveInput = z.infer<typeof updateInsightSaveSchema>;
