import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Button from "@material-ui/core/Button";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import Typography from "@material-ui/core/Typography";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import {
  calcProductivityLevelForDay,
  rewardForActivityType,
  populateStorageWithRandomData,
} from "./util";
import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
  DEFAULT_CONFIG,
} from "./constants";
import { DbHandle, Configuration, TrackInfoRecord } from "./types";
import { openIDB, clearTrackingStorage } from "./db";

type CNArg = string[] | Record<string, boolean>;
const cn = (...cns: CNArg[]): string => {
  let res = "";
  for (let i = 0; i < cns.length; ++i) {
    const cn = cns[i];
    if (cn instanceof Array) {
      if (i !== 0) res += " ";
      res += cn.join(" ");
    } else if (cn instanceof Object) {
      let currIdx = i;
      for (const key in cn) {
        if (cn[key]) {
          if (currIdx !== 0) res += " ";
          res += key;
          ++currIdx;
        }
      }
    }
  }
  return res;
};

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
      const result = (await store.getAll()) as any;
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

type TrackedRecordsGrouped = Map<number, TrackInfoRecord[]>;

const dateFormatHMS = (d: Date) =>
  d.toLocaleString(navigator.language, {
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  } as any);

const unixDuration = (n: number) => {
  let seconds = n / 1000;
  let minutes = Math.round(seconds / 60);
  seconds = Math.round(seconds % 60);
  const hours = Math.round(minutes / 60);
  minutes = Math.round(minutes % 60);
  return `${hours} HRS, ${minutes} MINUTES`;
};

const FullHistoryDay = (props: {
  config: Configuration<any>;
  date: Date;
  records: TrackInfoRecord[];
}) => {
  const { records, date, config } = props;
  // assume records are sorted
  const minTimestamp = records[0].date;
  const maxTimestamp = records[records.length - 1].date;
  const dayDuration = maxTimestamp - minTimestamp;
  const productivityLevel = calcProductivityLevelForDay(config, records);
  return (
    <Accordion className="day">
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="day-full-content"
        id="day-full-header"
      >
        <div className="day-header">
          <div className="day-header__left">
            <Typography className="day__title">
              <b>
                {date.toLocaleString(navigator.language, {
                  hourCycle: "h23",
                  weekday: "short",
                  year: "numeric",
                  month: "2-digit",
                  day: "numeric",
                } as any)}
              </b>
            </Typography>
            <Typography>{unixDuration(dayDuration)}</Typography>
            <Typography>Productivity: {productivityLevel}</Typography>
          </div>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div className="day-detailed-info">
          <div className="day-detailed-info__header">
            <Typography>Start: {dateFormatHMS(new Date(minTimestamp))}</Typography>
            <Typography>End: {dateFormatHMS(new Date(maxTimestamp))}</Typography>
          </div>
          <div className="day__records">
            {records.map(({ url, date, type }: TrackInfoRecord, idx: number) => {
              const isTypeDefined = type !== null;
              const dateStart = new Date(date);
              const timeS = dateStart.toLocaleString(navigator.language, {
                hourCycle: "h23",
                //year: "4-digit",
                //day: "2-digit",
                //hour: "2-digit",
                //minute: "2-digit",
              } as any);
              const c = cn({ "day-record": true, "day-record_type-not-defined": !isTypeDefined });
              return (
                <div key={idx} className={c}>
                  <span className="day-record__time">{timeS}</span>
                  <span className="day-record__url">{url}</span>
                </div>
              );
            })}
          </div>
        </div>
      </AccordionDetails>
    </Accordion>
  );
};

const Dashboard = () => {
  const [config, setConfig] = useChromeStorage<Configuration<any>>("tracker-config");
  const dbHandle = useIndexedDbHandle();
  const trackedRecords = useIndexedDbGetAllFromStore<TrackInfoRecord>(
    dbHandle,
    TRACK_INFO_STORE_NAME,
  );
  const trackedRecordsGrouped: TrackedRecordsGrouped = React.useMemo(() => {
    if (!trackedRecords || trackedRecords.length === 0) return new Map();
    return trackedRecords.reduce((acc: TrackedRecordsGrouped, rec) => {
      const d = new Date(rec.date);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (acc.get(day.getTime()) === undefined) acc.set(day.getTime(), []);
      acc.get(day.getTime()).push(rec);
      return acc;
    }, new Map() as TrackedRecordsGrouped);
  }, [trackedRecords]);
  // maybe sort by date before showing
  console.log(trackedRecordsGrouped);
  React.useEffect(() => {
    if (config === null) {
      setConfig(DEFAULT_CONFIG);
    }
  }, []);
  const allDayDates = Array.from(trackedRecordsGrouped.keys()).sort((a: number, b: number) => {
    return b - a;
  });

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Dashboard</h1>
        <h2>Full History</h2>
        <div>
          <Button
            onClick={() => populateStorageWithRandomData(config, dbHandle)}
            variant="contained"
            color="primary"
            disableElevation
          >
            Populate storage with random data
          </Button>
          <Button
            onClick={() => clearTrackingStorage(config, dbHandle)}
            variant="contained"
            color="primary"
            disableElevation
          >
            Clear storage
          </Button>
        </div>
      </header>
      <div className="full-history">
        {allDayDates.map((d: number) => {
          const records = trackedRecordsGrouped.get(d);
          const day = new Date(d);
          return <FullHistoryDay config={config} key={d} date={day} records={records} />;
        })}
      </div>
    </div>
  );
};

const rootElem = document.querySelector("#root");
ReactDOM.render(<Dashboard />, rootElem);
