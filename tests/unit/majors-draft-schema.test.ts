import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

type MajorDraft = {
  [key: string]: unknown;
};

const majorsDraftPath = path.resolve(
  process.cwd(),
  'data/reference/curriculum/review/majors-draft.json'
);

const majors = JSON.parse(fs.readFileSync(majorsDraftPath, 'utf8')) as MajorDraft[];

const expectedKeys = [
  'aliasesKo',
  'careerPathGroups',
  'fieldGuideId',
  'fieldNameKo',
  'id',
  'majorCourseBuckets',
  'nameKo',
  'notes',
  'recommendedStudentTraits',
  'relatedHighSchoolSubjectExamples',
  'reviewStatus',
  'similarMajorGroups',
  'sourceText',
  'summary',
  'universityExampleGroups',
].sort();

describe('majors-draft schema', () => {
  it('uses one unified grouped schema for every major entry', () => {
    expect(majors.length).toBeGreaterThan(0);

    for (const major of majors) {
      expect(Object.keys(major).sort()).toEqual(expectedKeys);
    }
  });

  it('does not mix old flat fields with grouped fields', () => {
    for (const major of majors) {
      expect(major).not.toHaveProperty('similarMajorNames');
      expect(major).not.toHaveProperty('universityExamples');
      expect(major).not.toHaveProperty('universityExamplesByTrack');
      expect(major).not.toHaveProperty('careerPathsByCategory');
    }
  });

  it('stores similar majors, universities, and careers as grouped arrays', () => {
    for (const major of majors) {
      expect(Array.isArray(major.similarMajorGroups)).toBe(true);
      expect(Array.isArray(major.universityExampleGroups)).toBe(true);
      expect(Array.isArray(major.careerPathGroups)).toBe(true);
    }
  });
});
