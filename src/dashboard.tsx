import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

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

// maybe sort by date before showing

chrome.storage.sync.get("trackedInfo", (data) => {
  console.log("what we have");
  console.log(data);
  const { trackedInfo } = data;
  const ta = trackedInfo.timeArray;
  for (let day in ta) {
    const content = `
`;
    items.innerHTML += content;
  }
});

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

const Dashboard = () => {
  const [trackedInfo, setTrackedInfo] = useChromeStorage<TrackedInfo>("trackedInfo");
  const ta = trackedInfo?.timeArray || {};
  return (
    <div>
      <h1>Hello this is dashboard</h1>
      {Object.keys(ta).map((dayKey) => {
        const dayTitle = dayKey;
        const dayRecords = ta[dayKey];
        return (
          <div className="day">
            <div className="day__title">{dayTitle}</div>
            {dayRecords.map((record: DayRecord) => {
              return <div className="day__record">{record.pageInfo.url}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
};

const rootElem = document.querySelector("#root");
ReactDOM.render(<Dashboard />, rootElem);
