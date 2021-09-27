export { DbHandle } from "idb-query";

export interface PageInfo {
  url: string;
}

export interface DayRecord {
  pageInfo: PageInfo;
  from: number;
  to: number;
}

export type DayRecords = DayRecord[];

export type TimeArray = Record<string, DayRecords>;

export interface TrackedInfo {
  timeArray: TimeArray;
}

export type Pair<A, B> = [A, B];
