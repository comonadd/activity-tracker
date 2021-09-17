import { ActivityTypesMapping, ActivityMatcher, Configuration } from "./types";

export const DB_NAME = "ti-main-db";
export const TRACK_INFO_STORE_NAME = "tracking-info";
export const USER_LOG_STORE_NAME = "user-logs";
export const ACTIVITY_UNDEFINED = -1;
// user-defined dictionary describing activity types
type DAT = "workRelated" | "properEntertainment" | "dumbEntertainment";
export const DEFAULT_ACTIVITY_TYPES: ActivityTypesMapping<DAT> = {
  workRelated: {
    description: "Important work stuff",
    reward: 100,
  },
  properEntertainment: {
    description: "Good kind of entertainment: film, TV, music",
    reward: 5,
  },
  dumbEntertainment: {
    description: "Bad and harmful entertainment: instagram, youtube",
    reward: 1,
  },
};
export const DEFAULT_ACTIVITY_MATCHER: ActivityMatcher<DAT> = {
  "habr.com": "workRelated",
  "news.ycombinator.com": "workRelated",
  "twitch.tv": "dumbEntertainment",
  "youtube.com": "dumbEntertainment",
};
export const DEFAULT_CONFIG: Configuration<
  keyof typeof DEFAULT_ACTIVITY_TYPES
> = {
  activityTypes: DEFAULT_ACTIVITY_TYPES,
  matcher: DEFAULT_ACTIVITY_MATCHER,
  prodLowerBound: 0,
  prodUpperBound: 1000,
};
