import * as idb from "idb/with-async-ittr.js";
import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  USER_LOG_STORE_NAME,
} from "./constants";
import { Configuration, ActTypeKey, TrackInfoRecord } from "./types";
import React, { useEffect, useState } from "react";
import { GroupedQuery, DbHandle, createIDBEntity } from "idb-query";
import { toDuration, calculateUrlType } from "./util";

export const openIDB = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    let DBOpenRequest = window.indexedDB.open(DB_NAME, 1);
    DBOpenRequest.onerror = function (event) {
      reject(event);
    };
    let db;
    DBOpenRequest.onsuccess = function (event) {
      db = DBOpenRequest.result;
      resolve(db);
    };
    DBOpenRequest.onupgradeneeded = function (event: any) {
      let db = event.target.result;
      db.onerror = function (event: any) {
        reject(event);
      };
      if (!db.objectStoreNames.contains(TRACK_INFO_STORE_NAME)) {
        const tiDb = db.createObjectStore(TRACK_INFO_STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        tiDb.createIndex("url", "url", { unique: false });
        tiDb.createIndex("created", "created", { unique: false });
      }
      if (!db.objectStoreNames.contains(USER_LOG_STORE_NAME)) {
        const tiDb = db.createObjectStore(USER_LOG_STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        tiDb.createIndex("created", "created", { unique: false });
      }
    };
  });
};

const db: Promise<DbHandle> = openIDB() as any;

// Single record = one visit to a particular URL
export const TrackedRecord = createIDBEntity<TrackInfoRecord, "created">(
  db,
  TRACK_INFO_STORE_NAME,
  "created"
);

export const UserLog = createIDBEntity<UserLogMessage, "created">(
  db,
  USER_LOG_STORE_NAME,
  "created"
);

export const addTrackedItem = async (item: TrackInfoRecord) => {
  await TrackedRecord.create(item);
};

export const addTrackedItems = async (items: TrackInfoRecord[]) =>
  await TrackedRecord.createMany(items);

const clearStorage = async (sname: string) => {
  const ddb = await db;
  const tx = ddb.transaction(sname, "readwrite");
  const store = tx.objectStore(sname);
  await store.clear();
};

export async function clearTrackingStorage<AK extends ActTypeKey>(
  config: Configuration<AK>
) {
  await clearStorage(TRACK_INFO_STORE_NAME);
}

export enum UserLogMessageType {
  Warning,
  Error,
  Info,
}
export interface UserLogMessage {
  type: UserLogMessageType;
  msg: string;
  created: Date;
}
export const saveUserLogMessage = async (
  db: DbHandle,
  msg: Omit<UserLogMessage, "created">
) => {
  const tx = db.transaction(USER_LOG_STORE_NAME, "readwrite");
  await tx.store.put({ ...msg, created: new Date() });
};

export function useIndexedDbHandle(): DbHandle {
  const [handle, setHandle] = React.useState<DbHandle>(null);
  React.useEffect(() => {
    (async () => {
      const ddb = await openIDB();
      setHandle(ddb);
    })();
  }, []);
  return handle;
}

export function useIndexedDbGetAllFromStore<T>(
  dbHandle: DbHandle,
  storeName: string
): T[] | null {
  const [data, setData] = React.useState<T[] | null>(null);
  React.useMemo(() => {
    if (dbHandle === null) return;
    const tx = dbHandle.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    (async () => {
      const result = (await store.getAll()) as any;
      setData(result);
    })();
  }, [dbHandle]);
  return data;
}

export function useIndexedDbGetAllFromStoreByIndex<T>(
  dbHandle: DbHandle,
  storeName: string,
  index: string
): [T[] | null, () => Promise<void>] {
  const [data, setData] = React.useState<T[] | null>(null);
  const refresh = async () => {
    if (dbHandle === null) return;
    const result = await dbHandle.getAllFromIndex(storeName, index);
    setData(result);
  };
  React.useMemo(() => {
    refresh();
  }, [dbHandle]);
  return [data, refresh];
}

const getRecordsInRange = async (
  db: DbHandle,
  fromDate: Date,
  toDate: Date
): Promise<TrackInfoRecord[]> => {
  return TrackedRecord.query()
    .byIndex("created")
    .from(fromDate)
    .to(toDate)
    .all();
};

export const allRecordsForDay = async (
  db: DbHandle,
  dayDate: Date
): Promise<TrackInfoRecord[]> => {
  const fromDate = dayDate;
  const toDate = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate() + 1
  );
  return getRecordsInRange(db, fromDate, toDate);
};

type CT = Date;

export const fetchRecords = async (
  startingDate_: Date,
  options: {
    perPage: number;
    reversed: boolean;
  }
): Promise<[TrackInfoRecord[], Date, boolean]> => {
  const startingDate =
    startingDate_ ?? (options.reversed ? new Date() : new Date(0));
  let qry: GroupedQuery<TrackInfoRecord> = TrackedRecord.query()
    .byIndex("created")
    .from(startingDate)
    .groupBy((item: any) => {
      return new Date(
        item.created.getFullYear(),
        item.created.getMonth(),
        item.created.getDate()
      ).getTime();
    });
  qry = qry.take(options.perPage);
  if (options.reversed) {
    qry = qry.desc();
  }
  const res: Map<any, any> = await qry.all();
  const data = Array.from(res.entries()).reduce((acc, ti) => {
    for (const item of ti[1]) {
      acc.push(item);
    }
    return acc;
  }, []);
  const nextCursor =
    data.length !== 0 ? data[data.length - 1].created : startingDate;
  const done = nextCursor.getTime() === startingDate.getTime();
  return [data, nextCursor, done];
};

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
  const fetchDataAndSaveCursor = React.useCallback(async () => {
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
  const nextPage = React.useCallback(() => {
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
  const fetchDataAndSaveCursor = React.useCallback(async () => {
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
  const loadMore = React.useCallback(() => {
    fetchDataAndSaveCursor();
  }, [fetchDataAndSaveCursor]);
  return { data, loadMore, refresh: () => {}, loadedEverything, loading };
}

export const clearUserLogs = async (db: DbHandle) => {
  const tx = db.transaction(USER_LOG_STORE_NAME, "readwrite");
  await tx.store.clear();
};

export interface ExportImportData {
  records: TrackInfoRecord[];
  logs: UserLogMessage[];
}
export const constructExportData = async (): Promise<ExportImportData> => {
  const data = {
    records: await TrackedRecord.query().all(),
    logs: await UserLog.query().all(),
  };
  return data;
};

export const importActivity = async (
  data: ExportImportData
): Promise<boolean> => {
  const existingRecordIds = new Set();
  for (const record of await TrackedRecord.query().all()) {
    existingRecordIds.add(record.created);
  }
  // TODO: Shouldn't the logs also be imported?
  for (const record of data.records) {
    if (existingRecordIds.has(record.created)) {
      console.info(record.created, "already exists, skipping");
      continue;
    }
    await TrackedRecord.create(record);
  }
  return true;
};

type Pair<A, B> = [A, B];

export const recalculateRecordTypes = async function* (
  config: Configuration<any>
): AsyncGenerator<Pair<number, number>> {
  const allRecords = await TrackedRecord.query().all();
  const totalRecords = allRecords.length;
  let processed = 0;
  for (const rec of allRecords) {
    await TrackedRecord.replace(rec.created, {
      ...rec,
      type: calculateUrlType(config, rec.url),
    });
    ++processed;
    yield [processed, totalRecords];
  }
};
