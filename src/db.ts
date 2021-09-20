import * as idb from "idb/with-async-ittr.js";
import {
  IDBPIndex,
  IDBPObjectStore,
  IDBPCursorWithValueIteratorValue,
} from "idb";
import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  USER_LOG_STORE_NAME,
} from "./constants";
import { Configuration, ActTypeKey, TrackInfoRecord, DbHandle } from "./types";
import React, { useEffect, useState } from "react";
import { createIDBEntity } from "idb-orm";

export const openIDB = async () => {
  return await idb.openDB(DB_NAME, 1, {
    upgrade(upgradeDb, oldVersion, newVersion, transaction) {
      if (!upgradeDb.objectStoreNames.contains(TRACK_INFO_STORE_NAME)) {
        const tiDb = upgradeDb.createObjectStore(TRACK_INFO_STORE_NAME, {
          autoIncrement: true,
        });
        tiDb.createIndex("url", "url", { unique: false });
        tiDb.createIndex("created", "created", { unique: false });
      }
      if (!upgradeDb.objectStoreNames.contains(USER_LOG_STORE_NAME)) {
        const tiDb = upgradeDb.createObjectStore(USER_LOG_STORE_NAME, {
          autoIncrement: true,
        });
        tiDb.createIndex("created", "created", { unique: false });
      }
    },
  });
};

export const addTrackedItem = async (item: TrackInfoRecord) => {
  await TrackedRecord.create(item);
};

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
      const db = await openIDB();
      setHandle(db);
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
  const tx = db.transaction(TRACK_INFO_STORE_NAME, "readonly");
  const store = tx.objectStore(TRACK_INFO_STORE_NAME);
  const index = store.index("created");
  const range = IDBKeyRange.bound(fromDate, toDate);
  const res = [];
  for await (const cursor of index.iterate(range)) {
    const r = { ...cursor.value };
    res.push(r);
  }
  return res;
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

// interface Stream {}
// const genToStream = (gen: Generator<any>): Stream => {
//
// };
// const streamNext
// const item = take(s);
// const item = take(s);
// const item = take(s);
// const afterMonth = startingDate + month;
// const items = takeUntil(s, (item) => item.created >= afterMonth);
//

type CT = Date;
async function* recordsPaginated(
  db: DbHandle,
  cursor: CT,
  options: {
    perPage: number;
    reversed: boolean;
  }
) {
  const fromDate = new Date(cursor);
  const toDate = new Date();
  const tx = db.transaction(TRACK_INFO_STORE_NAME, "readonly");
  const store = tx.objectStore(TRACK_INFO_STORE_NAME);
  const index = store.index("created");
  const range = IDBKeyRange.bound(fromDate, toDate);
  const res: TrackInfoRecord[] = [];
  for await (const c of index.iterate(range)) {
    if (res.length >= options.perPage) {
      break;
    }
    res.push(c.value);
    yield c.value;
  }
  const nextCursor = res[res.length - 1].created;
  console.log(res);
  return [res, nextCursor];
}

interface PaginatedController<T> {
  data: T;
  refresh: () => void;
  nextPage: () => void;
}

type Milliseconds = number;
type DateDelta = Milliseconds;
const dateDays = (days: number): DateDelta => {
  return days * 24 * 60 * 60 * 1000;
};
const dateAdd = (date: Date, what: DateDelta) => {
  return new Date(date.getTime() + what);
};

const db = openIDB();

const TrackedRecord = createIDBEntity<TrackInfoRecord, "created">(
  db,
  TRACK_INFO_STORE_NAME,
  "created"
);

const fetchData = async (startingDate: Date, perPage: number) => {
  const res: Map<any, any> = await TrackedRecord.query()
    .byIndex("created")
    .from(startingDate)
    .groupBy((item) => {
      return new Date(
        item.created.getFullYear(),
        item.created.getMonth(),
        item.created.getDate()
      ).getTime();
    })
    .take(perPage)
    .all();
  const resFlattened = Array.from(res.entries()).reduce((acc, ti) => {
    for (const item of ti[1]) {
      acc.push(item);
    }
    return acc;
  }, []);
  return resFlattened;
};

export function useTrackedItemsPaginatedByDay(
  options: {
    perPage?: number;
    reversed?: boolean;
    startingDate?: Date;
  } = {}
): PaginatedController<TrackInfoRecord[]> {
  const startingDate = options?.startingDate ?? new Date(0);
  const perPage = options?.perPage ?? 10;
  const [data, setData] = useState<TrackInfoRecord[]>([]);
  const fetchDataAndSaveCursor = React.useCallback(async () => {
    const c = data.length !== 0 ? data[data.length - 1].created : startingDate;
    const newData = await fetchData(c, perPage);
    const lastItem = newData[newData.length - 1];
    setData(newData);
  }, [data]);
  useEffect(() => {
    fetchDataAndSaveCursor();
  }, []);
  const nextPage = React.useCallback(() => {
    fetchDataAndSaveCursor();
  }, [fetchDataAndSaveCursor]);
  return { data, nextPage, refresh: () => {} };
}

export const allUserLogsSorted = (db: DbHandle) => {
  return useIndexedDbGetAllFromStoreByIndex<UserLogMessage>(
    db,
    USER_LOG_STORE_NAME,
    "created"
  );
};

export const clearUserLogs = async (db: DbHandle) => {
  const tx = db.transaction(USER_LOG_STORE_NAME, "readwrite");
  await tx.store.clear();
};
