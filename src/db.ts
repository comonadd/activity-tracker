import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  USER_LOG_STORE_NAME,
} from "./constants";
import React from "react";
import { DbHandle } from "idb-query";

export { DbHandle, createIDBEntity } from "idb-query";

export const openIDB = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const DBOpenRequest = window.indexedDB.open(DB_NAME, 3);
    DBOpenRequest.onerror = function (event) {
      reject(event);
    };
    let db;
    DBOpenRequest.onsuccess = function (event) {
      db = DBOpenRequest.result;
      resolve(db);
    };
    DBOpenRequest.onupgradeneeded = function (event: any) {
      const db = event.target.result;
      db.onerror = function (event: any) {
        reject(event);
      };
      const tiDb = db.createObjectStore(TRACK_INFO_STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
      tiDb.createIndex("id", "id", { unique: true });
      tiDb.createIndex("url", "url", { unique: false });
      tiDb.createIndex("created", "created", { unique: false });
      const ulDb = db.createObjectStore(USER_LOG_STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
      ulDb.createIndex("created", "created", { unique: false });
    };
  });
};

export const db: Promise<DbHandle> = openIDB() as any;

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
