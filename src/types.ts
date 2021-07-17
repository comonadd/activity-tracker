export interface ActivityDesc {
  description: string;
  reward: number;
}
export type ActTypeKey = string;
export type ActivityTypesMapping<AK extends ActTypeKey> = Record<AK, ActivityDesc>;
export type ActivityMatcher<AK extends ActTypeKey> = Record<string, AK>;
export type Configuration<AK extends ActTypeKey> = {
  // mapping from activity id to activity info
  activityTypes: ActivityTypesMapping<AK>;
  // mapping from regexp to activity id
  matcher: ActivityMatcher<AK>;
};
export type ActivityType = string | null;
export interface TrackInfoRecord {
  url: string;
  date: number;
  type: ActivityType;
}
export type DbHandle = any | null;
