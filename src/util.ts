import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
} from "./constants";
import {
  ActivityType,
  TrackInfoRecord,
  DbHandle,
  ActTypeKey,
  Configuration,
} from "./types";
import { addTrackedItem } from "./db";
import React, { useEffect, useState } from "react";

const URL_SELECTION = [
  "https://news.ycombinator.com",
  "https://google.com",
  "https://habr.ru",
  "https://www.github.com",
];

const chooseRandom = (arr: any[]) =>
  arr[Math.round(Math.random() * (arr.length - 1))];

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
  url: string
): ActivityType {
  const urlDomain = new URL(url).hostname;
  const matchers = Object.keys(config.matcher);
  let at = config.matcher[urlDomain];
  if (at !== undefined) return at;
  for (let matcher of matchers) {
    if (url.includes(matcher)) {
      at = config.matcher[matcher];
      return at;
    }
  }
  return null;
}

export function generateRandomRecords<AK extends ActTypeKey>(
  config: Configuration<AK>,
  nDays: number,
  nRecordsPerDay: number,
  dateStart: Date
): TrackInfoRecord[] {
  let records = [];
  const startHour = Math.round(Math.random() * 24);
  const endHour = Math.min(23, startHour + Math.round(Math.random() * 3));
  const uds = dateStart.getTime();
  for (let day = 0; day < nDays; ++day) {
    const dds = uds + day * 24 * 60 * 60 * 1000;
    for (let r = 0; r < nRecordsPerDay; ++r) {
      const url = randomUrl() + randomUrlPath();
      const date = new Date(
        dds + r * Math.round(Math.random() * 180) * 60 * 1000
      );
      const t = calculateUrlType(config, url);
      if (t !== null) {
        records.push({
          created: date,
          url,
          type: t,
        });
      }
    }
  }
  return records;
}

const randIntBetween = (s: number, e: number): number =>
  s + Math.round(Math.random() * (e - s));

const randomDateBetween = (start: Date, end: Date): Date => {
  const su = start.getTime();
  const eu = end.getTime();
  console.assert(eu >= su);
  return new Date(randIntBetween(su, eu));
};

export async function populateStorageWithRandomData<AK extends ActTypeKey>(
  config: Configuration<AK>,
  db: DbHandle
) {
  const startDate = randomDateBetween(new Date(2000, 0, 0), new Date());
  const randomRecords = generateRandomRecords(config, 30, 15, startDate);
  for (let i = 0; i < randomRecords.length; ++i) {
    const item = randomRecords[i];
    addTrackedItem(db, item);
  }
}

export function rewardForActivityType<AK extends ActTypeKey>(
  config: Configuration<AK>,
  at: ActivityType
): number {
  const ati = (config.activityTypes as any)[at];
  if (ati === undefined) {
    // TODO: Report to the user
    console.info(
      `Couldn't get activity type information from configuration for "${at}"`
    );
    return 0;
  }
  return ati.reward;
}

// Productivity is a measure of productive activity during the day. Ranges
// from 0 to 10, 10 being the highest productivity.
export const calcProductivityLevelForDay = (
  config: Configuration<any>,
  records: TrackInfoRecord[]
): number => {
  let prod = 0;
  for (let r of records) {
    const reward = rewardForActivityType(config, r.type);
    prod += reward;
  }
  return prod;
};

// TODO: Implement automatic sync
export function useChromeStorage<T>(key: string): [T, (v: T) => void] {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    chrome.storage.sync.get(key, (storageData: any) => {
      if (storageData) {
        setData(storageData[key] as any as T);
      } else {
        setData(null);
      }
    });
  }, [key]);
  const setNewValue = (newValue: T) => {
    chrome.storage.sync.set({ [key]: newValue });
    setData(newValue);
  };
  return [data, setNewValue];
}
