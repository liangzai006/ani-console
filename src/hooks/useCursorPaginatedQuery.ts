import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

export type CursorPage<T> = {
  items: T[];
  total: number;
  next_cursor?: string | null;
};

type UseCursorPaginatedQueryOptions<T> = {
  queryKey: readonly unknown[];
  fetchPage: (input: { cursor?: string; limit: number }) => Promise<CursorPage<T>>;
  initialPageSize?: number;
  enabled?: boolean;
  cursorScope?: unknown;
  refetchInterval?: number | false | ((data?: CursorPage<T>) => number | false);
};

export function useCursorPaginatedQuery<T>({
  queryKey,
  fetchPage,
  initialPageSize = 10,
  enabled = true,
  cursorScope,
  refetchInterval,
}: UseCursorPaginatedQueryOptions<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const pageCursors = useRef<Map<number, string | undefined>>(new Map([[1, undefined]]));

  const resetPagination = useCallback(() => {
    pageCursors.current = new Map([[1, undefined]]);
    setPage(1);
  }, []);

  useEffect(() => resetPagination(), [cursorScope, resetPagination]);

  const query = useQuery({
    queryKey: [...queryKey, { page, pageSize }],
    enabled,
    queryFn: async () => {
      let startPage = page;
      while (startPage > 1 && !pageCursors.current.has(startPage)) startPage -= 1;
      let cursor = pageCursors.current.get(startPage);
      let result: CursorPage<T> | undefined;

      for (let currentPage = startPage; currentPage <= page; currentPage += 1) {
        result = await fetchPage({ cursor, limit: pageSize });
        const nextCursor = result.next_cursor || undefined;
        if (nextCursor === cursor) throw new Error("列表接口返回了重复分页游标");
        pageCursors.current.set(currentPage + 1, nextCursor);
        if (currentPage < page && !nextCursor) {
          return { items: [], total: result.total, next_cursor: null };
        }
        cursor = nextCursor;
      }

      return result ?? { items: [], total: 0, next_cursor: null };
    },
    refetchInterval: (currentQuery) =>
      typeof refetchInterval === "function"
        ? refetchInterval(currentQuery.state.data)
        : refetchInterval,
  });

  const setPageSize = useCallback((nextPageSize: number) => {
    pageCursors.current = new Map([[1, undefined]]);
    setPageSizeState(nextPageSize);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    pageCursors.current = new Map([[1, undefined]]);
    if (page === 1) void query.refetch();
    else setPage(1);
  }, [page, query.refetch]);

  return {
    query,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  };
}
