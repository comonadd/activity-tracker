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
  LStatus,
} from "~/util";
import { dateFormatHMS, unixDuration, dateToString } from "~/dates";
import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
  DEFAULT_CONFIG,
} from "~/constants";
import { DbHandle, DayRecord } from "~/types";
import { Configuration } from "~/configuration";
import {
  TrackInfoRecord,
  TrackedDay,
  TrackedRecordsGrouped,
  fetchRecords,
} from "~/trackedRecord";
import { clearTrackingStorage } from "~/activity";
import {
  openIDB,
  useIndexedDbGetAllFromStore,
  useIndexedDbGetAllFromStoreByIndex,
  useIndexedDbHandle,
} from "~/db";
import { usePagedPaginatedController } from "~/hooks";
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

const FullHistoryList = () => {
  const { config } = useContext(AppContext);
  const trackedRecordsP = usePagedPaginatedController<TrackInfoRecord, Date>(
    fetchRecords,
    {
      reversed: true,
      perPage: 10,
    }
  );
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
};

export default FullHistoryList;
