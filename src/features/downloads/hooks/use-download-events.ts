"use client";

import { useEffect, useState } from "react";
import { upsertJob } from "../jobs";
import { EVENTS_URL, SSE_EVENTS } from "../sse";
import type { Job } from "../types";

export function useDownloadEvents(): Job[] {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const source = new EventSource(EVENTS_URL);
    // Yeniden bağlanınca sunucu tam listeyi gönderir; yerel liste onunla değişir
    source.addEventListener(SSE_EVENTS.snapshot, (event) => {
      setJobs(JSON.parse(event.data) as Job[]);
    });
    source.addEventListener(SSE_EVENTS.job, (event) => {
      const job = JSON.parse(event.data) as Job;
      setJobs((current) => upsertJob(current, job));
    });
    return () => source.close();
  }, []);

  return jobs;
}
