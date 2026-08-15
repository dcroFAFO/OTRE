function uniqueById(records = []) {
  return [...new Map(records.filter(Boolean).map((record) => [record.id, record])).values()];
}

function uniqueTimeline(events = []) {
  const seen = new Set();
  return events.filter((event) => {
    const key = [event.kind, event.title, event.subtitle, event.author, event.date, event.link].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime());
}

export function mergeClientHistoryPages(pages = []) {
  const validPages = pages.filter(Boolean);
  if (!validPages.length) return null;

  const first = validPages[0];
  const last = validPages[validPages.length - 1];
  const jobs = uniqueById(validPages.flatMap((page) => page.linked?.jobs || []));
  const invoices = uniqueById(validPages.flatMap((page) => page.linked?.invoices || []));
  const scooters = uniqueById(validPages.flatMap((page) => page.linked?.scooters || []));
  const feedback = uniqueById(validPages.flatMap((page) => page.linked?.feedback || []));
  const queryFailures = [...new Set(validPages.flatMap((page) => page.query_failures || []))];
  const hasMoreJobs = last.pagination?.has_more === true;
  const truncation = {
    ...validPages.reduce((merged, page) => {
      for (const [key, value] of Object.entries(page.truncation || {})) merged[key] = merged[key] || Boolean(value);
      return merged;
    }, {}),
    jobs: hasMoreJobs,
  };
  const potentiallyTruncated = hasMoreJobs
    || queryFailures.length > 0
    || Object.entries(truncation).some(([key, value]) => key !== "jobs" && value);

  return {
    ...first,
    linked: { ...first.linked, jobs, invoices, scooters, feedback },
    timeline: uniqueTimeline(validPages.flatMap((page) => page.timeline || [])),
    counts: {
      ...first.counts,
      jobs: jobs.length,
      invoices: invoices.length,
      scooters: scooters.length,
      feedback: feedback.length,
    },
    page: last.page,
    limit: last.limit,
    pagination: last.pagination,
    truncation,
    query_failures: queryFailures,
    partial: potentiallyTruncated,
    potentially_truncated: potentiallyTruncated,
    loaded_pages: validPages.length,
  };
}
