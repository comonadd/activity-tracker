export interface ActivityDesc {
  description: string;
  reward: number;
}
export type ActTypeKey = string;
export type ActivityTypesMapping<AK extends ActTypeKey> = Record<
  AK,
  ActivityDesc
>;
export type ActivityMatcher<AK extends ActTypeKey> = Record<string, AK>;
export type Configuration<AK extends ActTypeKey> = {
  // mapping from activity id to activity info
  activityTypes: ActivityTypesMapping<AK>;
  // mapping from regexp to activity id
  matcher: ActivityMatcher<AK>;
  // bounds
  prodLowerBound: number;
  prodUpperBound: number;
};
export type ActivityType = string | null;
export interface TrackInfoRecord {
  url: string;
  created: Date;
  type: ActivityType;
}
export type DbHandle = any | null;

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

export type TrackedDay = {
  title: string;
  date: number;
  records: TrackInfoRecord[];
};

export type TrackedRecordsGrouped = Map<number, TrackInfoRecord[]>;
