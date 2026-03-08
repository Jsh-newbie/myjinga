export const RECORD_CATEGORIES = [
  'dailyLog',
  'subjectNote',
  'creativeActivity',
  'volunteer',
  'reading',
  'award',
  'certificate',
  'careerIdea',
  'semesterReview',
] as const;

export const RECORD_STATUSES = ['draft', 'active', 'archived'] as const;

export const RECORD_SOURCES = ['dailyPrompt', 'manual', 'weeklyReview', 'semesterReview'] as const;

export type RecordCategory = (typeof RECORD_CATEGORIES)[number];
export type RecordStatus = (typeof RECORD_STATUSES)[number];
export type RecordSource = (typeof RECORD_SOURCES)[number];

export type StudentRecordMetadata = Record<string, unknown>;

export type StudentRecord = {
  id: string;
  category: RecordCategory;
  semester: string;
  title: string;
  content: string;
  careerRelevance?: string;
  subject?: string;
  hours?: number;
  attachments?: string[];
  aiDraft?: string;
  status?: RecordStatus;
  source?: RecordSource;
  tags?: string[];
  evidenceStatus?: 'none' | 'hasEvidence' | 'needsUpload';
  recordDate?: string;
  metadata?: StudentRecordMetadata;
  createdAt?: FirebaseFirestore.Timestamp | null;
  updatedAt?: FirebaseFirestore.Timestamp | null;
};

export type StudentRecordListQuery = {
  category?: RecordCategory;
  semester?: string;
  limit?: number;
  cursor?: string;
};
