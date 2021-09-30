import {
  calculateUrlType,
  ActivityType,
  ActTypeKey,
  Configuration,
} from "~/configuration";
import { TrackInfoRecord, addTrackedItems } from "./trackedRecord";
import { reportNoActivityMatcher } from "./userLog";
import { useEffect, useState } from "react";
import extAPI from "./extAPI";
import { dateAddDays, dateAddHours } from "~/dates";

const URL_SELECTION = [
  "https://news.ycombinator.com",
  "https://google.com",
  "https://habr.ru",
  "https://www.github.com",
  "https://reddit.com",
  "https://twitch.tv",
  "https://www.youtube.com",
  "https://trello.com",
  "https://stackoverflow.com",
  "https://vc.ru",
];

export function chooseRandom<T>(arr: T[]): T {
  return arr[Math.round(Math.random() * (arr.length - 1))];
}

const randomUrl = () => chooseRandom(URL_SELECTION);

const randomUrlPath = () => {
  const res = [""];
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

export function generateRandomRecords<AK extends ActTypeKey>(
  config: Configuration<AK>,
  nDays: number,
  nRecordsPerDay: number,
  dateStart: Date
): Omit<TrackInfoRecord, "id">[] {
  const records = [];
  const hoursPerRecord = 24 / nRecordsPerDay;
  const dateStartDay = new Date(
    dateStart.getFullYear(),
    dateStart.getMonth(),
    dateStart.getDate()
  );
  for (let day = 0; day < nDays; ++day) {
    const dds = dateAddDays(dateStartDay, day);
    for (let r = 0; r < nRecordsPerDay; ++r) {
      const url = randomUrl() + randomUrlPath();
      const date = dateAddHours(dds, hoursPerRecord * r);
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
): Promise<void> {
  const startDate = randomDateBetween(new Date(2000, 0, 0), new Date());
  const randomRecords = generateRandomRecords(config, 1200, 50, startDate);
  await addTrackedItems(randomRecords);
  await Promise.all(
    new Array(100).fill(null).map(async () => {
      await reportNoActivityMatcher(randomUrl());
    })
  );
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
  for (const r of records) {
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
    extAPI.storage.sync.set({ [key]: newValue });
    setData(newValue);
  };
  return [data, setNewValue, status];
}

export const getProdPerc = (
  config: Configuration<any>,
  prod: number
): number => {
  return (prod / config.prodUpperBound) * 100;
};

export const downloadBlob = (blob: Blob, fileName: string): void => {
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

export const rgbToCSS = (c: RGB): string => `rgb(${c.r}, ${c.g}, ${c.b})`;
export const colorGradient = (
  lowColor: RGB,
  highColor: RGB,
  pPerc: number
): RGB => {
  const r = lowColor.r + (highColor.r - lowColor.r) * pPerc;
  const g = lowColor.g + (highColor.g - lowColor.g) * pPerc;
  const b = lowColor.b + (highColor.b - lowColor.b) * pPerc;
  return { r, g, b };
};

export const interpRangeZero = (
  maxFrom: number,
  maxTo: number,
  v: number
): number => {
  const rangeK = maxTo / maxFrom;
  const pK = rangeK * v;
  return pK;
};
