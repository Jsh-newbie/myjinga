'use client';

import { useState } from 'react';

import { JobInfoModal, type JobModalItem } from '@/components/jobs/JobInfoModal';

// --- JobBadgeList ---

const COLLAPSE_THRESHOLD = 25;

export function JobBadgeList({ jobs }: { jobs: JobModalItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobModalItem | null>(null);

  const shouldCollapse = jobs.length > COLLAPSE_THRESHOLD;
  const visibleJobs = shouldCollapse && !expanded ? jobs.slice(0, COLLAPSE_THRESHOLD) : jobs;
  const hiddenCount = jobs.length - COLLAPSE_THRESHOLD;

  return (
    <>
      <div className="ctr-job-badges">
        {visibleJobs.map((j) => (
          <button
            key={`${j.code}-${j.name}`}
            type="button"
            className="ctr-job-badge ctr-job-badge--clickable"
            onClick={() => setSelectedJob(j)}
          >
            {j.name}
          </button>
        ))}
        {shouldCollapse && !expanded && (
          <button
            type="button"
            className="ctr-job-badge ctr-job-badge--more"
            onClick={() => setExpanded(true)}
          >
            +{hiddenCount}개 더보기
          </button>
        )}
        {shouldCollapse && expanded && (
          <button
            type="button"
            className="ctr-job-badge ctr-job-badge--more"
            onClick={() => setExpanded(false)}
          >
            접기
          </button>
        )}
      </div>
      {selectedJob && (
        <JobInfoModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </>
  );
}
