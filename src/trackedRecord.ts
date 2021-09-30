import { TRACK_INFO_STORE_NAME, TIME_PRECISION_POINT } from "./constants";
import { durationHours, dateDiff, Duration } from "~/dates";
import { Pair } from "~/types";
import { calculateUrlType, ActivityType, Configuration } from "~/configuration";
import { DbHandle, db, createIDBEntity } from "~/db";

export interface TrackInfoRecord {
  id: number;
  url: string;
  created: Date;
  type: ActivityType;
  duration: number;
}

export type TrackedDay = {
  title: string;
  date: number;
  records: TrackInfoRecord[];
};

export type TrackedRecordsGrouped = Map<number, TrackInfoRecord[]>;

const DUR_MAX_BETWEEN_TWO_POINTS = durationHours(2);

export const recDurationAtIndex = (
  records: TrackInfoRecord[],
  idx: number,
  if_not_known: Duration = TIME_PRECISION_POINT
): Duration => {
  return records[idx].duration;
};

// Single record = one visit to a particular URL
export const TrackedRecord = createIDBEntity<TrackInfoRecord, "id">(
  db,
  TRACK_INFO_STORE_NAME,
  "id"
);

export const addTrackedItem = async (item: Omit<TrackInfoRecord, "id">) => {
  const lastRec = await TrackedRecord.query().byIndex("created").desc().one();
  if (lastRec !== null) {
    await TrackedRecord.update(lastRec.id, {
      ...lastRec,
      duration: dateDiff(item.created, lastRec.created),
    });
  }
  await TrackedRecord.create(item);
};

export const addTrackedItems = async (items: Omit<TrackInfoRecord, "id">[]) => {
  await TrackedRecord.createMany(items);
};

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
    const offset = Math.max((pageNum - 1) * options.perPage, 0);
    let qry = TrackedRecord.query()
      .byIndex("created")
      .offset(offset)
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
      rec.id,
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
