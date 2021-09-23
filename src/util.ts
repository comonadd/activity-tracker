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
import extAPI from "./extAPI";

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
  config: Configuration<AK>
) {
  const startDate = randomDateBetween(new Date(2000, 0, 0), new Date());
  const randomRecords = generateRandomRecords(config, 365, 15, startDate);
  await Promise.all(randomRecords.map(addTrackedItem));
}

export function rewardForActivityType<AK extends ActTypeKey>(
  config: Configuration<AK>,
  at: ActivityType
): number {
  const ati = (config.activityTypes as any)[at];
  if (ati === undefined) {
    return 0;
  }
  return ati.reward;
}

export function recordProd<AK extends ActTypeKey>(
  config: Configuration<AK>,
  rec: TrackInfoRecord
): number {
  return rewardForActivityType(config, rec.type);
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

export enum LStatus {
  Loading = 0,
  Loaded = 1,
  Errored = 2,
}

// TODO: Implement automatic sync
export function useExtStorage<T>(key: string): [T, (v: T) => void, LStatus] {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<LStatus>(LStatus.Loading);
  useEffect(() => {
    extAPI.storage.sync.get(key, (storageData: any) => {
      if (storageData) {
        setData(storageData[key] as any as T);
      } else {
        setData(null);
      }
      setStatus(LStatus.Loaded);
    });
  }, [key]);
  const setNewValue = (newValue: T) => {
    console.log("setting new value", key, newValue);
    extAPI.storage.sync.set({ [key]: newValue });
    setData(newValue);
  };
  return [data, setNewValue, status];
}

export const dateFormatHMS = (d: Date) =>
  d.toLocaleString(navigator.language, {
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  } as any);

export const unixDuration = (n: number) => {
  let seconds = n / 1000;
  let minutes = Math.round(seconds / 60);
  seconds = Math.round(seconds % 60);
  const hours = Math.round(minutes / 60);
  minutes = Math.round(minutes % 60);
  return `${hours} HRS, ${minutes} MINUTES`;
};

export const dateToString = (date: Date) =>
  date.toLocaleString(navigator.language, {
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "numeric",
  } as any);

export const monthName = (date: Date) =>
  date.toLocaleString(navigator.language, {
    month: "long",
  } as any);

export const monthAndYear = (date: Date) =>
  date.toLocaleString(navigator.language, {
    year: "numeric",
    month: "long",
  } as any);

export const getProdPerc = (config: Configuration<any>, prod: number) => {
  return (prod / config.prodUpperBound) * 100;
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.setAttribute("download", fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export class DefaultMap<K, V> extends Map<K, V> {
  default_constructor: () => V;
  constructor(default_constructor: () => V, ...args: any[]) {
    super(...args);
    this.default_constructor = default_constructor;
  }
  get(key: K): V {
    if (this.has(key)) return super.get(key);
    const v = this.default_constructor();
    this.set(key, v);
    return v;
  }
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const rgbToCSS = (c: RGB) => `rgb(${c.r}, ${c.g}, ${c.b})`;
export const colorGradient = (lowColor: RGB, highColor: RGB, pPerc: number) => {
  const r = lowColor.r + (highColor.r - lowColor.r) * pPerc;
  const g = lowColor.g + (highColor.g - lowColor.g) * pPerc;
  const b = lowColor.b + (highColor.b - lowColor.b) * pPerc;
  return { r, g, b };
};

export const toDuration = (dur: Date | null) =>
  dur !== null ? dur.toISOString().substr(11, 8) : "N/A";

export const interpRangeZero = (maxFrom: number, maxTo: number, v: number) => {
  const rangeK = maxTo / maxFrom;
  const pK = rangeK * v;
  return pK;
};
