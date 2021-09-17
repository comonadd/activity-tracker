import React, { useEffect, useState, useContext } from "react";
import Page from "~/components/Page";
import { Link } from "~/routeManager";
import { useIndexedDbHandle } from "~/db";
import {
  DbHandle,
  Configuration,
  TrackInfoRecord,
  TrackedDay,
  TrackedRecordsGrouped,
  DayRecord,
} from "~/types";
import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
  DEFAULT_CONFIG,
} from "~/constants";
import { Paper, Typography, Breadcrumbs } from "~/theme";
import AppContext from "~/AppContext";
import {
  dateFormatHMS,
  getProdPerc,
  calcProductivityLevelForDay,
  dateToString,
} from "~/util";
import { DataGrid } from "@mui/x-data-grid";

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

const ProductivityLevel = (props: {
  config: Configuration<any>;
  level: number;
}) => {
  const { config, level } = props;
  const prodP = getProdPerc(config, level);
  const width = 100 - prodP;
  return (
    <div className="prod-level-bar">
      <div
        className="prod-level-bar__part"
        style={{ width: `${width}%` }}
      ></div>
    </div>
  );
};

const columns = [
  { field: "url", headerName: "Site", width: 300 },
  { field: "created", headerName: "Started", width: 150 },
  { field: "duration", headerName: "Duration", width: 150 },
];

const DayPage = (props: DayPageProps) => {
  const { year, month, day } = props;
  const { config } = useContext(AppContext);
  const db = useIndexedDbHandle();
  const [records, setRecords] = useState<TrackInfoRecord[]>([]);
  const dayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const prodLevel = calcProductivityLevelForDay(config, records);
  useEffect(() => {
    (async () => {
      if (db === null) return;
      const res = await allRecordsForDay(db, dayDate);
      setRecords(res);
    })();
  }, [db]);

  const rows = React.useMemo(
    () =>
      records.map((rec, idx) => {
        const nextRow = idx !== records.length - 1 ? records[idx + 1] : null;
        const duration: Date | null = nextRow
          ? (((nextRow.created as any) - (rec.created as any)) as any)
          : (((new Date() as any) - (rec.created as any)) as any);
        const durationD = new Date(duration);
        const durationS =
          durationD !== null ? durationD.toISOString().substr(11, 8) : "N/A";
        return {
          ...rec,
          created: dateToString(rec.created),
          id: rec.created.getTime(),
          duration: durationS,
        };
      }),
    [records]
  );

  return (
    <Page title={`${year}/${month}/${day}`}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link color="inherit" to="/">
          Dashboard
        </Link>
      </Breadcrumbs>
      <Typography component="h1" variant="h4">
        {dateToString(dayDate)}
      </Typography>
      <div>This day has {records.length} records.</div>
      <div>Productivity level: {prodLevel}.</div>
      <ProductivityLevel level={prodLevel} config={config} />
      <div className="day-log">
        <DataGrid rows={rows} columns={columns} checkboxSelection />
      </div>
    </Page>
  );
};

export default DayPage;
