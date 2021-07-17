import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
} from "./constants";
import { ActivityType, TrackInfoRecord, DbHandle, ActTypeKey, Configuration } from "./types";
import { addTrackedItem } from "./db";

const URL_SELECTION = [
  "https://news.ycombinator.com",
  "https://google.com",
  "https://habr.ru",
  "https://www.github.com",
];

const chooseRandom = (arr: any[]) => arr[Math.round(Math.random() * (arr.length - 1))];

const randomUrl = () => chooseRandom(URL_SELECTION);

const randomUrlPath = () => {
  let res = [""];
  const N = Math.round(Math.random() * 5) + 3;
  for (let i = 0; i < N; ++i) {
    const partLen = Math.round(Math.random() * 5) + 3;
    let part = "";
    for (let j = 0; j < partLen; ++j) {
      part += String.fromCharCode(Math.round(Math.random() * 25) + 97);
    }
    res.push(part);
  }
  const resPath = res.join("/");
  return resPath;
};

export function calculateUrlType<AK extends ActTypeKey>(
  config: Configuration<AK>,
  url: string,
): ActivityType {
  const urlDomain = new URL(url).hostname;
  const matchers = Object.keys(config.matcher);
  let at = config.matcher[urlDomain];
  if (at === undefined) {
    for (let matcher of matchers) {
      if (url.includes(matcher)) {
        at = config.matcher[matcher];
        break;
      }
    }
    if (at === undefined) return null;
  }
  return at;
}

export function generateRandomRecords<AK extends ActTypeKey>(
  config: Configuration<AK>,
  nDays: number,
  nRecordsPerDay: number,
  dateStart: Date,
) {
  let records = [];
  const startHour = Math.round(Math.random() * 24);
  const endHour = Math.min(23, startHour + Math.round(Math.random() * 3));
  const uds = dateStart.getTime();
  for (let day = 0; day < nDays; ++day) {
    const dds = uds + day * 1000;
    for (let r = 0; r < nRecordsPerDay; ++r) {
      const url = randomUrl() + randomUrlPath();
      records.push({
        date: dds + r * 100,
        url,
        type: calculateUrlType(config, url),
      });
    }
  }
  return records;
}

export async function populateStorageWithRandomData<AK extends ActTypeKey>(
  config: Configuration<AK>,
  db: DbHandle,
) {
  const randomRecords = generateRandomRecords(config, 3, 5, new Date(2012, 1, 1));
  for (let { url } of randomRecords) {
    setTimeout(async () => {
      const item: TrackInfoRecord = {
        url,
        date: new Date().getTime(),
        type: calculateUrlType(config, url),
      };
      console.log(item);
      addTrackedItem(db, item);
    }, 5);
  }
}
