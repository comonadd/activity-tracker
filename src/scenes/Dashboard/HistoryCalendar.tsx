import {
  calcProductivityLevelForDay,
  DefaultMap,
  RGB,
  colorGradient,
  rgbToCSS,
} from "~/util";
import { dateToString, monthName, monthAndYear } from "~/dates";
import { useTheme, Typography, Paper } from "~/theme";
import React from "react";
import AppContext from "~/AppContext";
import { history } from "~/routeManager";
import NoRecords from "./NoRecords";
import { useCursorPaginatedController } from "~/hooks";
import { Configuration } from "~/configuration";
import {
  TrackInfoRecord,
  TrackedRecordsGrouped,
  trackedRecordFetcher,
} from "~/trackedRecord";
import Sentry from "~/components/ScrollSentry";
import CircularProgress from "@material-ui/core/CircularProgress";

interface HistoryCalendarProps {}

const highColorBound = 255;

const CalendarDay = (props: {
  config: Configuration<any>;
  records: TrackInfoRecord[];
  d: number;
}) => {
  const { config, d, records } = props;
  const { lowColor, highColor } = useTheme();
  const rangeK = highColorBound / config.prodUpperBound;
  const dayDate = new Date(d);
  const year = dayDate.getFullYear();
  const month = dayDate.getMonth() + 1;
  const day = dayDate.getDate();
  // shrink productivity level into a color between lowColorBound and highColorBound
  let productivityLevel = calcProductivityLevelForDay(config, records);
  productivityLevel = Math.min(
    Math.max(productivityLevel, config.prodLowerBound),
    config.prodUpperBound
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

const HistoryCalendar = (_: HistoryCalendarProps) => {
  const { config } = React.useContext(AppContext);
  const trackedRecordsP = useCursorPaginatedController<TrackInfoRecord, Date>(
    trackedRecordFetcher,
    {
      reversed: true,
      perPage: 60,
    }
  );
  const trackedRecords = trackedRecordsP.data;
  const loadingRecords = trackedRecordsP.loading;
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
    if (months.length === 0) {
      if (loadingRecords) {
        return (
          <div className="w-100 h-100 f-100 df fc">
            <CircularProgress />
          </div>
        );
      }
      return (
        <div className="w-100 h-100 f-100 df fc">
          <NoRecords />
        </div>
      );
    }
    return (
      <div className="full-history-calendar-items">
        {months.map((monthDate: number) => {
          const monthEntries: Day[] = allMonthsByYear.get(monthDate);
          return (
            <MonthGroup
              key={monthDate}
              monthDate={monthDate}
              monthEntries={monthEntries}
              trackedRecordsGrouped={trackedRecordsGrouped}
            />
          );
        })}
        {loadingRecords && (
          <div className="w-100 h-100 f-100 df fc pv-16">
            <CircularProgress />
          </div>
        )}
      </div>
    );
  }, [loadingRecords, trackedRecordsGrouped, config, allDayDates]);

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
    <div className="full-history-calendar f-100">
      {renderedCalendar}
      {!trackedRecordsP.loadedEverything && <Sentry whenInView={loadMore} />}
    </div>
  );
};

export default HistoryCalendar;
