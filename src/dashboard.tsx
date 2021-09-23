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
} from "~/theme";
import Dashboard from "~/scenes/Dashboard";
import "~/app.css";
import "~/dashboard.css";

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
