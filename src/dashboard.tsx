import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { populateStorageWithRandomData } from "./util";
import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
  DEFAULT_CONFIG,
} from "./constants";
import { DbHandle, Configuration, TrackInfoRecord } from "./types";
import { openIDB } from "./db";

interface PageInfo {
  url: string;
}

interface DayRecord {
  pageInfo: PageInfo;
  from: number;
  to: number;
}

type DayRecords = DayRecord[];

type TimeArray = Record<string, DayRecords>;

interface TrackedInfo {
  timeArray: TimeArray;
}

const items = document.querySelector(".items");

// TODO: Implement automatic sync
function useChromeStorage<T>(key: string): [T, (v: T) => void] {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    chrome.storage.sync.get(key, (storageData: any) => {
      if (storageData) {
        setData((storageData[key] as any) as T);
      } else {
        setData(null);
      }
    });
  }, [key]);
  const setNewValue = React.useCallback(
    (newValue: T) => {
      chrome.storage.sync.set({ [key]: newValue });
      setData(newValue);
    },
    [key],
  );
  return [data, setNewValue];
}

function useIndexedDbHandle(): DbHandle {
  const [handle, setHandle] = React.useState<DbHandle>(null);
  React.useEffect(() => {
    (async () => {
      const db = await openIDB();
      setHandle(db);
    })();
  }, []);
  return handle;
}

function useIndexedDbGetAllFromStore<T>(dbHandle: DbHandle, storeName: string): T[] | null {
  const [data, setData] = React.useState<T[] | null>(null);
  React.useMemo(() => {
    if (dbHandle === null) return;
    const tx = dbHandle.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    (async () => {
      const result = await store.getAll() as any;
      setData(result);
    })();
  }, [dbHandle]);
  return data;
}

type TrackedDay = {
  title: string;
  date: number;
  records: TrackInfoRecord[];
};

const Dashboard = () => {
  const [config, setConfig] = useChromeStorage<Configuration<any>>("tracker-config");
  const dbHandle = useIndexedDbHandle();
  const trackedInfo = useIndexedDbGetAllFromStore<TrackInfoRecord>(dbHandle, TRACK_INFO_STORE_NAME);
  const trackedRecordsGrouped: TrackedDay[] = trackedInfo && trackedInfo.length !== 0
    ? [{ date: trackedInfo?.[0].date, title: "Hello", records: trackedInfo }]
    : [];
  // maybe sort by date before showing
  const ta = trackedInfo;
  console.log(ta);
  React.useEffect(() => {
    if (config === null) {
      setConfig(DEFAULT_CONFIG);
    }
  }, []);
  return (
    <div>
      <h1>Hello this is dashboard</h1>
      <div>
        <button onClick={() => populateStorageWithRandomData(config, dbHandle)}>
          Populate storage with random data
        </button>
      </div>
      {trackedRecordsGrouped.map(({ date, title, records }: TrackedDay) => {
        return (
          <div className="day" key={date}>
            <div className="day__title">{title}</div>
            {records.map(({ url, date }: TrackInfoRecord, idx: number) => {
              const dateStart = new Date(date);
              const timeS = dateStart.toLocaleString(navigator.language, {
                hourCycle: "h23",
                hour: "2-digit",
                minute: "2-digit",
              } as any);
              return (
                <div key={idx} className="day-record">
                  <span className="day-record__time">{timeS}</span>
                  <span className="day-record__url">{url}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const rootElem = document.querySelector("#root");
ReactDOM.render(<Dashboard />, rootElem);
