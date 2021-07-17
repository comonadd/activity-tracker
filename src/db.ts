import * as idb from "idb";
import { DB_NAME, TRACK_INFO_STORE_NAME } from "./constants";
import { TrackInfoRecord, DbHandle } from "./types";

export const openIDB = async () => {
  return await idb.openDB(DB_NAME, 1, {
    upgrade(upgradeDb, oldVersion, newVersion, transaction) {
      console.log("upgrading");
      if (!upgradeDb.objectStoreNames.contains(TRACK_INFO_STORE_NAME)) {
        const tiDb = upgradeDb.createObjectStore(TRACK_INFO_STORE_NAME, { keyPath: "date" });
        tiDb.createIndex("url", "url", { unique: false });
        tiDb.createIndex("date", "date", { unique: true });
      }
    },
  });
};

export const addTrackedItem = async (db: DbHandle, item: TrackInfoRecord) => {
  const tx = db.transaction(TRACK_INFO_STORE_NAME, "readwrite");
  const store = tx.objectStore(TRACK_INFO_STORE_NAME);
  await store.add(item);
};
