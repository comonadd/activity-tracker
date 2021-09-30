import React, { useState, useEffect, useMemo, useContext } from "react";
import { calcProductivityLevelForDay } from "~/util";
import { unixDuration, dateToString } from "~/dates";
import { Configuration } from "~/configuration";
import {
  TrackInfoRecord,
  TrackedRecordsGrouped,
  trackedRecordFetcher,
} from "~/trackedRecord";
import CircularProgress from "@material-ui/core/CircularProgress";
import { usePagedPaginatedController } from "~/hooks";
import { useQueryParam, history } from "~/routeManager";
import AppContext from "~/AppContext";
import { Size, Grid, Card, CardContent, Button, Typography } from "~/theme";
import Pagination from "~/components/Pagination";
import NoRecords from "./NoRecords";
import ProductivityLevel from "~/components/ProductivityLevel";

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
    <Card elevation={2} className="full-history-item">
      <CardContent className="full-history-item__content">
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Grid container spacing={1}>
              <Grid item xs={10}>
                <Typography component="div" variant="h6">
                  {dateToString(date)}
                </Typography>
                <div>
                  <span className="fs-12">{`${unixDuration(
                    dayDuration
                  )}`}</span>
                </div>
              </Grid>
              <Grid item xs={2} className="df fcv frr">
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
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <ProductivityLevel
              size={Size.Small}
              config={config}
              level={productivityLevel}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

const FullHistoryList = (props: { page: number }) => {
  const { config } = useContext(AppContext);
  const [startFrom, setStartFrom] = useQueryParam<number>(
    "page",
    props.page ?? 0
  );
  const trackedRecordsP = usePagedPaginatedController<TrackInfoRecord>(
    trackedRecordFetcher,
    {
      startFrom,
      perPage: 7,
    }
  );
  const [loadedFirstItems, setLoadedFirstItems] = useState(false);
  useEffect(() => {
    if (
      !loadedFirstItems &&
      !trackedRecordsP.loading &&
      trackedRecordsP.data.length !== 0
    ) {
      setLoadedFirstItems(true);
    }
  }, [trackedRecordsP.loading]);
  useEffect(() => {
    setStartFrom(trackedRecordsP.currentPage);
  }, [trackedRecordsP.currentPage]);
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

  const renderedItems = useMemo(() => {
    if (trackedRecordsP.loading) {
      return (
        <div className="w-100 h-100 f-100 df fc">
          <CircularProgress variant="indeterminate" />
        </div>
      );
    }
    if (allDayDates.length === 0) {
      return <NoRecords />;
    }
    return (
      <div className="f-100 h-100">
        <Grid container spacing={1} className="pv-8 ph-2">
          {allDayDates.map((d) => {
            const records = trackedRecordsGrouped.get(d);
            const day = new Date(d);
            return (
              <Grid item xs={12} key={d}>
                <FullHistoryDay
                  config={config}
                  key={d}
                  date={day}
                  records={records}
                />
              </Grid>
            );
          })}
        </Grid>
      </div>
    );
  }, [
    trackedRecordsGrouped,
    trackedRecordsP.loading,
    trackedRecordsP.totalPages,
  ]);

  return (
    <div className="full-history w-100 h-100 df f-100">
      {renderedItems}
      {loadedFirstItems && (
        <div className="full-history-pagination df pv-8">
          <Pagination
            count={trackedRecordsP.totalPages}
            current={trackedRecordsP.currentPage}
            radius={3}
            onChange={(n) => {
              trackedRecordsP.loadPage(n);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default FullHistoryList;
