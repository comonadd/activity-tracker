import { useMemo, useEffect, useCallback, useState } from "react";

interface PaginatedController<T> {
  data: T[];
  refresh: () => void;
  loadedEverything: boolean;
  loading: boolean;
}

interface PagedPaginatedController<T> extends PaginatedController<T> {
  nextPage: () => void;
}

interface CursorPaginatedController<T> extends PaginatedController<T> {
  loadMore: () => void;
}

interface PaginatedOptions {
  perPage?: number;
  reversed?: boolean;
  startingDate?: Date;
}

type PaginatedDataFetcher<T, C> = (
  cursor: C,
  options: PaginatedOptions
) => Promise<[T[], C, boolean]>;

export function usePagedPaginatedController<T, C>(
  fetchData: PaginatedDataFetcher<T, C>,
  options: PaginatedOptions = {}
): PagedPaginatedController<T> {
  const startingDate = options?.startingDate ?? null;
  const reversed = options?.reversed ?? false;
  const perPage = options?.perPage ?? 10;
  const [data, setData] = useState<T[]>([]);
  const [cursor, setCursor] = useState<C | null>(null);
  const [loadedEverything, setLoadedEverything] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const fetchDataAndSaveCursor = useCallback(async () => {
    if (loadedEverything) return;
    setLoading(true);
    const [newData, newCursor, done] = await fetchData(cursor, options);
    if (done) {
      setLoadedEverything(true);
    }
    setData(newData);
    setCursor(newCursor);
    setLoading(false);
  }, [data, cursor]);
  useEffect(() => {
    fetchDataAndSaveCursor();
  }, []);
  const nextPage = useCallback(() => {
    fetchDataAndSaveCursor();
  }, [fetchDataAndSaveCursor]);
  return { data, nextPage, refresh: () => {}, loadedEverything, loading };
}

export function useCursorPaginatedController<T, C>(
  fetchData: PaginatedDataFetcher<T, C>,
  options: PaginatedOptions = {}
): CursorPaginatedController<T> {
  const startingDate = options?.startingDate ?? null;
  const reversed = options?.reversed ?? false;
  const perPage = options?.perPage ?? 10;
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
    const started = Date.now();
    const [newData, newCursor, done] = await fetchData(cursor, options);
    const ended = Date.now();
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
  return { data, loadMore, refresh: () => {}, loadedEverything, loading };
}

let __LS_KEY = 0;

export function useLocalStorageState<T>(initialValue: T): [T, (v: T) => void] {
  const key = useMemo(() => (__LS_KEY++).toString(), []);
  const [value, setValue] = useState<T>(initialValue);
  useEffect(() => {
    const stored = localStorage.getItem(key);
    console.log(stored);
    if (stored !== undefined) {
      console.log("setting value");
      setValue(JSON.parse(stored));
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [value]);
  return [value, setValue];
}
