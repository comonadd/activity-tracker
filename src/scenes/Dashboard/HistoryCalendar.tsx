import {
  calcProductivityLevelForDay,
  rewardForActivityType,
  populateStorageWithRandomData,
  useExtStorage,
  dateFormatHMS,
  unixDuration,
  dateToString,
  LStatus,
} from "~/util";
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
import React from "react";
import AppContext from "~/AppContext";
import DashboardContext from "./DashboardContext";
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
} from "~/routeManager";
import {
  openIDB,
  clearTrackingStorage,
  useIndexedDbGetAllFromStore,
  useIndexedDbGetAllFromStoreByIndex,
  useIndexedDbHandle,
  useTrackedItemsPaginatedByDay,
} from "~/db";
import {
  DbHandle,
  Configuration,
  TrackInfoRecord,
  TrackedDay,
  TrackedRecordsGrouped,
  DayRecord,
} from "~/types";

interface HistoryCalendarProps {}

const HistoryCalendar = (props: HistoryCalendarProps) => {
  const lowColor = [20, 20, 20];
  const highColor = [0, 255, 0];
  const ck = highColor.map((v, i) => v - lowColor[i]);
  const highColorBound = 255;
  const highProbBound = 1000;
  const lowProbBound = 0;
  const rangeK = highColorBound / highProbBound;
  const { config } = React.useContext(AppContext);
  const trackedRecordsP = useTrackedItemsPaginatedByDay({
    reversed: true,
    perPage: 10,
  });
  const trackedRecords = trackedRecordsP.data;
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
  const allDayDates = Array.from(trackedRecordsGrouped.keys()).sort(
    (a: number, b: number) => {
      return a - b;
    }
  );
  return (
    <div className="full-history-calendar">
      {allDayDates.map((d) => {
        const records = trackedRecordsGrouped.get(d);
        const dayDate = new Date(d);
        const year = dayDate.getFullYear();
        const month = dayDate.getMonth() + 1;
        const day = dayDate.getDate();
        // shrink productivity level into a color between lowColorBound and highColorBound
        let productivityLevel = calcProductivityLevelForDay(config, records);
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
            <Typography variant="subtitle2">{dateToString(dayDate)}</Typography>
          </Paper>
        );
      })}
      <Button onClick={trackedRecordsP.nextPage}>Next page</Button>
    </div>
  );
};

export default HistoryCalendar;
