import React, {
  useMemo,
  useContext,
  createContext,
  useState,
  useEffect,
} from "react";
import ReactDOM from "react-dom";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Accordion from "@material-ui/core/Accordion";
import Grid from "@material-ui/core/Grid";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import Breadcrumbs from "@material-ui/core/Breadcrumbs";
import Card from "@material-ui/core/Card";
import Paper from "@material-ui/core/Paper";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import Typography from "@material-ui/core/Typography";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import TodayIcon from "@material-ui/icons/Today";
import ListIcon from "@material-ui/icons/List";
import {
  calcProductivityLevelForDay,
  rewardForActivityType,
  populateStorageWithRandomData,
  useChromeStorage,
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
import {
  openIDB,
  clearTrackingStorage,
  useIndexedDbGetAllFromStore,
  useIndexedDbGetAllFromStoreByIndex,
  useIndexedDbHandle,
} from "./db";
import { createHashHistory, Location } from "history";

const history = createHashHistory();

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

interface IAppContext {
  config: Configuration<any>;
  setConfig: (s: Configuration<any>) => void;
}
const AppContext = createContext<IAppContext>({} as any);

type RouteParams = Record<string, string>;
interface IRouterContext {
  params: RouteParams;
}
const RouterContext = createContext<IRouterContext>({ params: {} });
// Return all parameters for the current route
function useParams<T>(): T {
  const { params } = React.useContext(RouterContext);
  return params as any as T;
}

const Link = (props: { to: string; children: any } & any) => {
  return (
    <a
      href={props.to}
      {...props}
      onClick={(e) => {
        e.preventDefault();
        history.push(props.to);
      }}
    >
      {props.children}
    </a>
  );
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

const Page = (props: { title: string; children: any }) => {
  const { title, children } = props;
  React.useEffect(() => {
    document.title = title;
  }, [title]);
  return <div className="page">{children}</div>;
};

interface DayPageProps {
  year: string;
  month: string;
  day: string;
}

const allRecordsForDay = async (
  db: DbHandle,
  dayDate: Date
): Promise<TrackInfoRecord[]> => {
  const tx = db.transaction(TRACK_INFO_STORE_NAME, "readonly");
  const store = tx.objectStore(TRACK_INFO_STORE_NAME);
  const index = store.index("created");
  const fromDate = dayDate;
  const toDate = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate() + 1
  );
  const range = IDBKeyRange.bound(fromDate, toDate);
  const res = [];
  for await (const cursor of index.iterate(range)) {
    const r = { ...cursor.value };
    res.push(r);
  }
  return res;
};

const DayPage = (props: DayPageProps) => {
  const { year, month, day } = props;
  const { config } = useContext(AppContext);
  const db = useIndexedDbHandle();
  const [records, setRecords] = useState<TrackInfoRecord[]>([]);
  const dayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  useEffect(() => {
    (async () => {
      if (db === null) return;
      const res = await allRecordsForDay(db, dayDate);
      setRecords(res);
    })();
  }, [db]);
  return (
    <Page title={`${year}/${month}/${day}`}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link color="inherit" to="/">
          Dashboard
        </Link>
      </Breadcrumbs>
      <Typography component="h1" variant="h4">
        The day of {year}/{month}/{day}
      </Typography>
      <div className="full-history">
        <FullHistoryDay records={records} config={config} date={dayDate} />
      </div>
    </Page>
  );
};

interface MonthPageProps {}

const MonthPage = (props: MonthPageProps) => {
  const { year, month } = useParams<any>();
  return (
    <Page title={`${year}/${month}`}>
      <h1>
        {year}/{month}
      </h1>
    </Page>
  );
};

interface YearPageProps {}

const YearPage = (props: YearPageProps) => {
  const { year } = useParams<any>();
  return (
    <Page title={`Year ${year}`}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link color="inherit" to="/">
          Dashboard
        </Link>
      </Breadcrumbs>
      <h1>{year}</h1>
    </Page>
  );
};

const dateToString = (date: Date) =>
  date.toLocaleString(navigator.language, {
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "numeric",
  } as any);

const FullHistoryDay = (props: {
  config: Configuration<any>;
  date: Date;
  records: TrackInfoRecord[];
}) => {
  const { records, date, config } = props;
  // assume records are sorted
  const minTimestamp = records.length !== 0 ? records[0].created : new Date();
  const maxTimestamp =
    records.length !== 0 ? records[records.length - 1].created : new Date();
  const dayDuration = maxTimestamp.getTime() - minTimestamp.getTime();
  const productivityLevel = calcProductivityLevelForDay(config, records);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return (
    <Accordion className="day">
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="day-full-content"
        id="day-full-header"
      >
        <div className="day-header">
          <div className="day-header__left">
            <Typography className="day__title" title={date.toString()}>
              <b>{dateToString(date)}</b>
            </Typography>
            <Typography>{unixDuration(dayDuration)}</Typography>
            <Typography>Productivity: {productivityLevel}</Typography>
            <Link to={`/${year}/${month}/${day}`}>Details</Link>
            <Button
              onClick={() => {
                history.push(`/${year}/${month}/${day}`);
              }}
              variant="outlined"
              color="primary"
              disableElevation
            >
              Details
            </Button>
          </div>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div className="day-detailed-info">
          <div className="day-detailed-info__header">
            <Typography>
              Start: {dateFormatHMS(new Date(minTimestamp))}
            </Typography>
            <Typography>
              End: {dateFormatHMS(new Date(maxTimestamp))}
            </Typography>
          </div>
          <div className="day__records">
            {records.map(
              ({ url, created, type }: TrackInfoRecord, idx: number) => {
                const date = created;
                const isTypeDefined = type !== null;
                const dateStart = new Date(date);
                const timeS = date.toLocaleString(navigator.language, {
                  hourCycle: "h23",
                  //year: "4-digit",
                  //day: "2-digit",
                  //hour: "2-digit",
                  //minute: "2-digit",
                } as any);
                const c = cn({
                  "day-record": true,
                  "day-record_type-not-defined": !isTypeDefined,
                });
                return (
                  <div key={idx} className={c}>
                    <span className="day-record__time">{timeS}</span>
                    <span className="day-record__url">{url}</span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </AccordionDetails>
    </Accordion>
  );
};

enum Mode {
  Calendar = 0,
  List = 1,
}
const firstViewingMode = Mode.Calendar;
const viewingModesAvailable = Object.keys(Mode).length / 2;

const Dashboard = () => {
  const { config, setConfig } = useContext(AppContext);
  const dbHandle = useIndexedDbHandle();
  const trackedRecords = useIndexedDbGetAllFromStoreByIndex<TrackInfoRecord>(
    dbHandle,
    TRACK_INFO_STORE_NAME,
    "created"
  );
  const trackedRecordsGrouped: TrackedRecordsGrouped = React.useMemo(() => {
    if (!trackedRecords || trackedRecords.length === 0) return new Map();
    return trackedRecords.reduce((acc: TrackedRecordsGrouped, rec) => {
      const day = rec.created;
      const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      if (acc.get(d.getTime()) === undefined) acc.set(d.getTime(), []);
      acc.get(d.getTime()).push(rec);
      return acc;
    }, new Map() as TrackedRecordsGrouped);
  }, [trackedRecords]);
  // maybe sort by date before showing
  React.useEffect(() => {
    if (config === null) {
      setConfig(DEFAULT_CONFIG);
    }
  }, []);
  const allDayDates = Array.from(trackedRecordsGrouped.keys()).sort(
    (a: number, b: number) => {
      return a - b;
    }
  );
  const [viewingMode, setViewingMode] = useState<Mode>(Mode.Calendar);
  const viewingModeIcon = useMemo(() => {
    switch (viewingMode) {
      case Mode.Calendar:
        {
          return <TodayIcon />;
        }
        break;
      case Mode.List:
        {
          return <ListIcon />;
        }
        break;
      default:
        {
          return null;
        }
        break;
    }
  }, [viewingMode]);
  const toggleViewingMode = () => {
    let next = (viewingMode as number) + 1;
    if (next >= viewingModesAvailable) next = firstViewingMode;
    setViewingMode(next);
  };

  const historyRendered = useMemo(() => {
    switch (viewingMode) {
      case Mode.List:
        {
          return (
            <div className="full-history">
              {allDayDates.map((d) => {
                const records = trackedRecordsGrouped.get(d);
                const day = new Date(d);
                return (
                  <FullHistoryDay
                    config={config}
                    key={d}
                    date={day}
                    records={records}
                  />
                );
              })}
            </div>
          );
        }
        break;
      case Mode.Calendar:
        {
          const lowColor = [20, 20, 20];
          const highColor = [0, 255, 0];
          const ck = highColor.map((v, i) => v - lowColor[i]);
          const highColorBound = 255;
          const highProbBound = 1000;
          const lowProbBound = 0;
          const rangeK = highColorBound / highProbBound;
          return (
            <div className="full-history-calendar">
              {allDayDates.map((d) => {
                const records = trackedRecordsGrouped.get(d);
                const dayDate = new Date(d);
                const year = dayDate.getFullYear();
                const month = dayDate.getMonth() + 1;
                const day = dayDate.getDate();
                // shrink productivity level into a color between lowColorBound and highColorBound
                let productivityLevel = calcProductivityLevelForDay(
                  config,
                  records
                );
                productivityLevel = Math.min(
                  Math.max(productivityLevel, lowProbBound),
                  highProbBound
                );
                const pK = rangeK * productivityLevel;
                const pPerc = pK / 255;
                const r = lowColor[0] + ck[0] * pPerc;
                const g = lowColor[1] + ck[1] * pPerc;
                const b = lowColor[2] + ck[2] * pPerc;
                const backgroundColor = `rgb(${r}, ${g}, ${b})`;
                return (
                  <Paper
                    elevation={1}
                    key={dayDate.getTime()}
                    className="calendar-item"
                    onClick={() => history.push(`/${year}/${month}/${day}`)}
                    style={{ backgroundColor }}
                    title={`Productivity: ${productivityLevel}`}
                  >
                    <Typography variant="subtitle2">
                      {dateToString(dayDate)}
                    </Typography>
                  </Paper>
                );
              })}
            </div>
          );
        }
        break;
      default:
        {
          console.error("Not implemented");
          return null;
        }
        break;
    }
  }, [trackedRecordsGrouped]);

  return (
    <Page title="Activity Dashboard">
      <div className="dashboard">
        <header className="header df fsb">
          <Typography component="h1" variant="h3">
            Dashboard
          </Typography>
          <div className="dashboard-controls fcv">
            <Grid container spacing={1} className="fcv">
              <Grid item>
                <Button
                  onClick={() =>
                    populateStorageWithRandomData(config, dbHandle)
                  }
                  variant="contained"
                  color="primary"
                  size="large"
                  disableElevation
                >
                  Populate storage with random data
                </Button>
              </Grid>
              <Grid item>
                <Button
                  onClick={() => clearTrackingStorage(config, dbHandle)}
                  variant="contained"
                  size="large"
                  color="primary"
                  disableElevation
                >
                  Clear storage
                </Button>
              </Grid>
              <Grid item>
                <IconButton
                  onClick={() => toggleViewingMode()}
                  size="medium"
                  title="Toggle view"
                >
                  {viewingModeIcon}
                </IconButton>
              </Grid>
            </Grid>
          </div>
        </header>
        {historyRendered}
      </div>
    </Page>
  );
};

const NotFound = () => {
  return <Page title="Not found">Not found</Page>;
};

type RouteMatcher = [RegExp, (...args: any[]) => any][];

const routeMatcher: RouteMatcher = [
  [/^\/$/g, (params) => <Dashboard />],
  [/^\/(\d+)\/(\d+)\/?$/g, (params) => <YearPage />],
  [/^\/(\d+)\/(\d+)\/?$/g, (params) => <MonthPage />],
  [
    /^\/(\d+)\/(\d+)\/(\d+)\/?$/g,
    ([year, month, day]) => <DayPage year={year} month={month} day={day} />,
  ],
  [/.*/g, (params) => <NotFound />],
];

const matchLocation = (
  config: RouteMatcher,
  loc: Location | null
): any | null => {
  if (loc === null) return null;
  let p = "";
  if (loc["key"] !== undefined) {
    // history module location
    p = loc.pathname;
  } else {
    if (loc.hash.length === 0) {
      p = "/";
    } else {
      p = loc.hash.substr(1, loc.hash.length);
    }
  }
  for (let pair of config) {
    const r = pair[0];
    if (new RegExp(r).test(p)) {
      // matches
      const mm = p.matchAll(new RegExp(r));
      let m = [...mm][0];
      let params = m || [];
      delete params["index"];
      delete params["input"];
      delete params["groups"];
      params = params.slice(1);
      const c = pair[1];
      return c(params);
    }
  }
  return () => null as any;
};

const useLocation = (): Location => {
  const [location, setLocation] = useState<Location>(window.location as any);
  React.useEffect(() => {
    history.listen((update) => {
      setLocation(update.location);
    });
  }, []);
  return location;
};

const App = () => {
  const location = useLocation();
  const [currRouteParams, setCurrRouteParams] = React.useState<RouteParams>({});
  const [config, setConfig] =
    useChromeStorage<Configuration<any>>("tracker-config");
  const componentToRender = matchLocation(routeMatcher, location);
  return (
    <RouterContext.Provider value={{ params: currRouteParams }}>
      <AppContext.Provider value={{ config, setConfig }}>
        <div className="app">{componentToRender}</div>
      </AppContext.Provider>
    </RouterContext.Provider>
  );
};

const rootElem = document.querySelector("#root");
ReactDOM.render(<App />, rootElem);
