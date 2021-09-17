import * as idb from "idb/with-async-ittr.js";
import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  USER_LOG_STORE_NAME,
} from "./constants";
import { Configuration, ActTypeKey, TrackInfoRecord, DbHandle } from "./types";
import React, { useEffect, useState } from "react";

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

export const addTrackedItem = async (db: DbHandle, item: TrackInfoRecord) => {
  const tx = db.transaction(TRACK_INFO_STORE_NAME, "readwrite");
  await tx.store.put(item);
};

const clearStorage = async (db: DbHandle, sname: string) => {
  const tx = db.transaction(sname, "readwrite");
  const store = tx.objectStore(sname);
  await store.clear();
};

export async function clearTrackingStorage<AK extends ActTypeKey>(
  config: Configuration<AK>,
  db: DbHandle
) {
  await clearStorage(db, TRACK_INFO_STORE_NAME);
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
