import type { Job } from "./types";

// Yeni işler en üste; bilinen iş yerinde güncellenir
export function upsertJob(jobs: Job[], job: Job): Job[] {
  const index = jobs.findIndex((current) => current.id === job.id);
  if (index === -1) return [job, ...jobs];
  return jobs.map((current, i) => (i === index ? job : current));
}
