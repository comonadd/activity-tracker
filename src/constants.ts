import {
  ActivityTypesMapping,
  ActivityMatcher,
  Configuration,
} from "./configuration";
import { Duration, durationMinutes } from "~/dates";

export const DB_NAME = "ti-main-db";
export const TRACK_INFO_STORE_NAME = "tracking-info";
export const USER_LOG_STORE_NAME = "user-logs";
export const ACTIVITY_UNDEFINED = -1;
// user-defined dictionary describing activity types
type DAT =
  | "workRelated"
  | "properEntertainment"
  | "dumbEntertainment"
  | "reading"
  | "searching";
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
    description: "Harmful entertainment: instagram, youtube",
    reward: 1,
  },
  reading: {
    description: "Reading stuff",
    reward: 10,
  },
  searching: {
    description: "Searching stuff",
    reward: 5,
  },
};
export const DEFAULT_ACTIVITY_MATCHER: ActivityMatcher<DAT> = {
  "github.com": "workRelated",
  "news.google.com": "reading",
  "imdb.com": "reading",
  "netflix.com": "properEntertainment",
  "twitch.tv": "dumbEntertainment",
  "youtube.com": "dumbEntertainment",
  "google.com": "searching",
};
export const DEFAULT_CONFIG: Configuration<
  keyof typeof DEFAULT_ACTIVITY_TYPES
> = {
  activityTypes: DEFAULT_ACTIVITY_TYPES,
  matcher: DEFAULT_ACTIVITY_MATCHER,
  prodLowerBound: 0,
  prodUpperBound: 1000,
  urlIgnorePattern:
    "(chrome://.*|chrome-extension:.*|moz-extension://.*|about:.*)",
  activityColors: {
    workRelated: "#9cff57",
    dumbEntertainment: "#ff6434",
    searching: "#ff6434",
    properEntertainment: "#64c1ff",
    reading: "#64c1ff",
  },
};
// How much time to assign to a record if the next record is missing and so it's impossible to
// determine how much user spent on that site.
export const TIME_PRECISION_POINT: Duration = durationMinutes(10);
