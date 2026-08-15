import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

export const DEFAULT_ENTITY_PAGE_SIZE = 100;

/**
 * Convert an SDK response into a page with an honest `hasMore` signal. The
 * caller requests one probe row beyond the visible page size.
 *
 * @param {Array<Record<string, any>>} records
 * @param {number} pageSize
 * @param {number} skip
 */
export function toEntityPage(records, pageSize, skip) {
  const safeRecords = Array.isArray(records) ? records : [];
  return {
    items: safeRecords.slice(0, pageSize),
    skip,
    hasMore: safeRecords.length > pageSize,
  };
}

/** @param {Array<{items?: Array<Record<string, any>>}>} pages */
export function flattenEntityPages(pages = []) {
  const records = pages.flatMap((page) => page.items || []);
  return [...new Map(records.map((record, index) => [record.id || `row-${index}`, record])).values()];
}

/**
 * Shared pagination for direct Base44 entity reads. `fetchPage` receives the
 * SDK limit (including one probe row) and offset; consumers decide whether to
 * call `list` or `filter`.
 *
 * @param {{
 *   queryKey: Array<any>,
 *   fetchPage: (params: {limit: number, skip: number, signal?: AbortSignal}) => Promise<Array<Record<string, any>>>,
 *   pageSize?: number,
 *   enabled?: boolean,
 *   staleTime?: number,
 *   preservePreviousData?: boolean,
 * }} options
 */
export function useEntityPages({
  queryKey,
  fetchPage,
  pageSize = DEFAULT_ENTITY_PAGE_SIZE,
  enabled = true,
  staleTime = 30_000,
  preservePreviousData = true,
}) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const records = await fetchPage({ limit: pageSize + 1, skip: pageParam, signal });
      return toEntityPage(records, pageSize, pageParam);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasMore
      ? lastPage.skip + lastPage.items.length
      : undefined,
    enabled,
    staleTime,
    placeholderData: preservePreviousData ? keepPreviousData : undefined,
  });
  const pages = query.data?.pages || [];

  return {
    ...query,
    data: flattenEntityPages(pages),
    loadedPages: pages.length,
    potentiallyTruncated: query.hasNextPage === true,
  };
}
