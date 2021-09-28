import { useEffect, useCallback, useState } from "react";

interface PaginatedController<T> {
  data: T[];
  loading: boolean;
}

interface CursorPaginatedDataFetcherOptions<C> {
  perPage?: number;
  reversed?: boolean;
  startingCursor?: C;
}

type CursorPaginatedDataFetcher<T, C> = {
  fetchWithCursor: (
    cursor: C,
    options: CursorPaginatedDataFetcherOptions<C>
  ) => Promise<[T[], C, boolean]>;
};

interface CursorPaginatedController<T> extends PaginatedController<T> {
  loadMore: () => void;
  loadedEverything: boolean;
  refresh: () => Promise<void>;
}

export function useCursorPaginatedController<T, C>(
  fetcher: CursorPaginatedDataFetcher<T, C>,
  options: CursorPaginatedDataFetcherOptions<C> = {}
): CursorPaginatedController<T> {
  const [data, setData] = useState<T[]>([]);
  const [cursor, setCursor] = useState<C | null>(null);
  const [loadedEverything, setLoadedEverything] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const fetchDataAndSaveCursor = useCallback(async () => {
    if (loadedEverything) {
      return;
    }
    if (loading) {
      return;
    }
    setLoading(true);
    const [newData, newCursor, done] = await fetcher.fetchWithCursor(
      cursor,
      options
    );
    if (done) {
      setLoadedEverything(true);
    }
    setData([...data, ...newData]);
    setCursor(newCursor);
    setLoading(false);
  }, [loading, loadedEverything, data, cursor]);
  useEffect(() => {
    fetchDataAndSaveCursor();
  }, []);
  const loadMore = useCallback(() => {
    fetchDataAndSaveCursor();
  }, [fetchDataAndSaveCursor]);
  return { data, loadMore, refresh: async () => {}, loadedEverything, loading };
}

interface PagedPaginationFetcherOptions {
  perPage?: number;
  reversed?: boolean;
}

type PagedPaginatedDataFetcher<T> = {
  fetchTotalPages: (options: PagedPaginationFetcherOptions) => Promise<number>;
  fetchByPage: (
    page: number,
    options: PagedPaginationFetcherOptions
  ) => Promise<T[]>;
};

interface PagedPaginatedController<T> extends PaginatedController<T> {
  totalPages: number;
  currentPage: number;
  lastPage: boolean;
  firstPage: boolean;
  loadPage: (pNum: number) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
}

export function usePagedPaginatedController<T>(
  fetchData: PagedPaginatedDataFetcher<T>,
  options: PagedPaginationFetcherOptions = {}
): PagedPaginatedController<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [currentPage, setcurrentPage] = useState(0);
  const lastPage = currentPage === totalPages;
  const firstPage = currentPage === 0;
  const fetchPage = useCallback(
    async (pageNum: number) => {
      console.assert(totalPages !== null, "Total pages not known yet");
      console.assert(
        pageNum >= 0 && pageNum < totalPages,
        `Tried to fetch page number which is outside of the boundaries (pageNum: ${pageNum}, totalPages: ${totalPages})`
      );
      setLoading(true);
      const newData = await fetchData.fetchByPage(pageNum, options);
      setData(newData);
      setLoading(false);
      setcurrentPage(pageNum);
    },
    [data, totalPages]
  );
  const nextPage = useCallback(async () => {
    if (lastPage) return;
    await fetchPage(currentPage + 1);
  }, [fetchPage]);
  const prevPage = useCallback(async () => {
    if (firstPage) return;
    await fetchPage(currentPage - 1);
  }, [fetchPage]);

  useEffect(() => {
    if (totalPages === 0 || totalPages === null) return;
    fetchPage(0);
  }, [totalPages]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const tPages = await fetchData.fetchTotalPages(options);
      setTotalPages(tPages);
      setLoading(false);
    })();
  }, []);

  return {
    totalPages,
    currentPage,
    data,
    prevPage,
    nextPage,
    loadPage: fetchPage,
    lastPage,
    firstPage,
    loading,
  };
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): [T, (v: T) => void] {
  const getStoredValue = () => {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      return JSON.parse(stored);
    }
    return undefined;
  };
  const [value, setValue] = useState<T>(getStoredValue() ?? initialValue);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [value]);
  return [value, setValue];
}
