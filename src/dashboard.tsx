import React, {
  useMemo,
  useContext,
  createContext,
  useState,
  useEffect,
} from "react";
import ReactDOM from "react-dom";
import {
  calcProductivityLevelForDay,
  rewardForActivityType,
  populateStorageWithRandomData,
  useExtStorage,
  dateFormatHMS,
  unixDuration,
  dateToString,
  LStatus,
} from "./util";
import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
  DEFAULT_CONFIG,
} from "./constants";
import {
  DbHandle,
  Configuration,
  TrackInfoRecord,
  TrackedDay,
  TrackedRecordsGrouped,
  DayRecord,
} from "./types";
import {
  openIDB,
  clearTrackingStorage,
  useIndexedDbGetAllFromStore,
  useIndexedDbGetAllFromStoreByIndex,
  useIndexedDbHandle,
} from "./db";
import "./app.css";
import "./dashboard.css";
import {
  Link,
  history,
  Location,
  useLocation,
  matchLocation,
  RouteMatcher,
  useParams,
  RouterContext,
  RouteParams,
} from "./routeManager";
import cn from "~/cn";
import Page from "~/components/Page";
import AppContext from "~/AppContext";
import DayPage from "~/scenes/DayPage";
import YearPage from "~/scenes/YearPage";
import MonthPage from "~/scenes/MonthPage";
import {
  IconButton,
  SettingsIcon,
  Button,
  Typography,
  ListIcon,
  TodayIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ExpandMoreIcon,
  Paper,
  Grid,
  Breadcrumbs,
} from "~/theme";

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
  const [trackedRecords, _] =
    useIndexedDbGetAllFromStoreByIndex<TrackInfoRecord>(
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
    if (config === null) {
      console.error("Configuration is null");
      return null;
    }
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
              {process.env.NODE_ENV === "development" && (
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
              )}
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
              <Grid item>
                <IconButton
                  onClick={() => history.push("/settings/")}
                  size="medium"
                  title="Open settings"
                >
                  <SettingsIcon />
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

const App = () => {
  const location = useLocation();
  const [currRouteParams, setCurrRouteParams] = React.useState<RouteParams>({});
  const [config, setConfig, cStatus] =
    useExtStorage<Configuration<any>>("tracker-config");
  React.useEffect(() => {
    if (cStatus === LStatus.Loaded && config === null) {
      setConfig(DEFAULT_CONFIG);
    }
  }, [config, cStatus]);
  if (cStatus === LStatus.Loading) return null;
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
