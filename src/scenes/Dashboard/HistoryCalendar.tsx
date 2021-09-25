import {
  calcProductivityLevelForDay,
  rewardForActivityType,
  populateStorageWithRandomData,
  useExtStorage,
  dateFormatHMS,
  unixDuration,
  dateToString,
  LStatus,
  monthName,
  monthAndYear,
  DefaultMap,
  RGB,
  colorGradient,
  rgbToCSS,
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
import React, { useState } from "react";
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
  fetchRecords,
  clearTrackingStorage,
  useIndexedDbGetAllFromStore,
  useIndexedDbGetAllFromStoreByIndex,
  useIndexedDbHandle,
  useCursorPaginatedController,
} from "~/db";
import {
  DbHandle,
  Configuration,
  TrackInfoRecord,
  TrackedDay,
  TrackedRecordsGrouped,
  DayRecord,
} from "~/types";
import Sentry from "~/components/ScrollSentry";

interface HistoryCalendarProps {}

// TODO: Move this to configuration
const lowColor: RGB = { r: 250, g: 250, b: 250 };
const highColor: RGB = { r: 0, g: 255, b: 0 };
const highColorBound = 255;
const highProbBound = 1000;
const lowProbBound = 0;
const rangeK = highColorBound / highProbBound;

const CalendarDay = (props: {
  config: Configuration<any>;
  records: TrackInfoRecord[];
  d: number;
}) => {
  const { config, d, records } = props;
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
  const pPerc = pK / highColorBound;
  const backgroundColor = rgbToCSS(colorGradient(lowColor, highColor, pPerc));
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
};

const MonthGroup = (props: {
  monthEntries: number[];
  trackedRecordsGrouped: TrackedRecordsGrouped;
  monthDate: number;
}) => {
  const { monthEntries, trackedRecordsGrouped } = props;
  const { config } = React.useContext(AppContext);
  const mDate = new Date(props.monthDate);
  const currDate = new Date();
  const needToRemindOfYear = currDate.getFullYear() - mDate.getFullYear() !== 0;
  const title = needToRemindOfYear ? monthAndYear(mDate) : monthName(mDate);
  const renderedMonthEntries = monthEntries.map((d: number) => {
    const records = trackedRecordsGrouped.get(d);
    return <CalendarDay key={d} config={config} records={records} d={d} />;
  });
  return (
    <div className="cal-month-group" key={props.monthDate}>
      <div className="pv-10 df fcv w-100">
        <Typography
          variant="subtitle2"
          component="p"
          title={dateToString(mDate)}
        >
          {title}
        </Typography>
      </div>
      <div className="cal-month-group-items">{renderedMonthEntries}</div>
    </div>
  );
};

const HistoryCalendar = (props: HistoryCalendarProps) => {
  const { config } = React.useContext(AppContext);
  const trackedRecordsP = useCursorPaginatedController<TrackInfoRecord, Date>(
    fetchRecords,
    {
      reversed: true,
      perPage: 30,
    }
  );
  const trackedRecords = trackedRecordsP.data;
  // Group records by day
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
  // List of all dates
  const allDayDates = Array.from(trackedRecordsGrouped.keys()).map(
    (a) => new Date(a)
  );
  type Day = number;
  const allMonthsByYear: Map<number, Day[]> = React.useMemo(
    () =>
      allDayDates.reduce((acc, d: Date) => {
        const month = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        const dList = acc.get(month);
        dList.push(d.getTime());
        return acc;
      }, new DefaultMap<number, Day[]>(Array)),
    [allDayDates]
  );
  const renderedCalendar = React.useMemo(() => {
    const months = Array.from(allMonthsByYear.keys());
    if (months.length === 0)
      return (
        <div className="w-100 h-100 f-100">
          <Typography component="p" variant="subtitle1">
            No tracked records found
          </Typography>
        </div>
      );
    return months.map((monthDate: number) => {
      const monthEntries: Day[] = allMonthsByYear.get(monthDate);
      return (
        <MonthGroup
          key={monthDate}
          monthDate={monthDate}
          monthEntries={monthEntries}
          trackedRecordsGrouped={trackedRecordsGrouped}
        />
      );
    });
  }, [trackedRecordsGrouped, config, allDayDates]);

  const containerRef = React.useRef(null);
  const loadMore = React.useCallback(() => {
    if (trackedRecordsP.loading) {
      return;
    }
    if (trackedRecordsP.loadedEverything) {
      return;
    }
    (async () => {
      await trackedRecordsP.loadMore();
    })();
  }, [trackedRecordsP]);
  return (
    <div className="full-history-calendar" ref={containerRef}>
      <div className="full-history-calendar-items">{renderedCalendar}</div>
      <Sentry whenInView={loadMore} ref={containerRef} />
    </div>
  );
};

export default HistoryCalendar;
