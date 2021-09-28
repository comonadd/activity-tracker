import { TRACK_INFO_STORE_NAME, TIME_PRECISION_POINT } from "./constants";
import { dateDiff, Duration } from "~/dates";
import { Pair } from "~/types";
import { calculateUrlType, ActivityType, Configuration } from "~/configuration";
import { DbHandle, db, createIDBEntity } from "~/db";

export interface TrackInfoRecord {
  url: string;
  created: Date;
  type: ActivityType;
}

export type TrackedDay = {
  title: string;
  date: number;
  records: TrackInfoRecord[];
};

export type TrackedRecordsGrouped = Map<number, TrackInfoRecord[]>;

export const recDurationAtIndex = (
  records: TrackInfoRecord[],
  idx: number
): Duration => {
  const rec = records[idx];
  const nextRow = idx !== records.length - 1 ? records[idx + 1] : null;
  const duration: Duration | null = nextRow
    ? dateDiff(nextRow.created, rec.created)
    : TIME_PRECISION_POINT;
  return duration;
};

// Single record = one visit to a particular URL
export const TrackedRecord = createIDBEntity<TrackInfoRecord, "created">(
  db,
  TRACK_INFO_STORE_NAME,
  "created"
);

export const addTrackedItem = async (item: TrackInfoRecord) => {
  await TrackedRecord.create(item);
};

export const addTrackedItems = async (items: TrackInfoRecord[]) =>
  await TrackedRecord.createMany(items);

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

export const trackedRecordFetcher = {
  async fetchWithCursor(
    startingDate_: Date,
    options: {
      perPage: number;
      reversed: boolean;
    }
  ): Promise<[TrackInfoRecord[], Date, boolean]> {
    const startingDate =
      startingDate_ ?? (options.reversed ? new Date() : new Date(0));
    let qry = TrackedRecord.query()
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
  },

  async fetchTotalPages(options: { perPage: number }) {
    const totalRecords = await TrackedRecord.query().byIndex("id").count();
    const pages = Math.ceil(totalRecords / options.perPage);
    return pages;
  },

  async fetchByPage(
    pageNum: number,
    options: {
      perPage: number;
      reversed: boolean;
    }
  ): Promise<TrackInfoRecord[]> {
    const offset = pageNum * options.perPage;
    let qry = TrackedRecord.query()
      .byIndex("id")
      .from(offset)
      .groupBy((item: any) => {
        return new Date(
          item.created.getFullYear(),
          item.created.getMonth(),
          item.created.getDate()
        ).getTime();
      })
      .take(options.perPage);
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
    return data;
  },
};

export const recalculateRecordTypes = async function* (
  config: Configuration<any>
): AsyncGenerator<Pair<number, number>> {
  const allRecords = await TrackedRecord.query().all();
  const totalRecords = allRecords.length;
  let processed = 0;
  const tx = await TrackedRecord.createTransaction("readwrite");
  for (const rec of allRecords) {
    await TrackedRecord.replace(
      rec.created,
      {
        ...rec,
        type: calculateUrlType(config, rec.url),
      },
      tx
    );
    ++processed;
    yield [processed, totalRecords];
  }
};
