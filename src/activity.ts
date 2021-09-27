import { TrackInfoRecord, TrackedRecord } from "~/trackedRecord";
import { UserLogMessage, UserLog } from "~/userLog";
import { db } from "~/db";
import { TRACK_INFO_STORE_NAME } from "~/constants";

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

export const clearStorage = async (sname: string) => {
  const ddb = await db;
  const tx = ddb.transaction(sname, "readwrite");
  const store = tx.objectStore(sname);
  await store.clear();
};

export async function clearTrackingStorage() {
  await clearStorage(TRACK_INFO_STORE_NAME);
}
