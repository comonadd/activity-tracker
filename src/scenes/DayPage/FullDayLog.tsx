import React from "react";
import { TrackInfoRecord } from "~/trackedRecord";
import {
  dateFormatHMS,
  toDuration,
  Duration,
  dateDiff,
} from "~/dates";
import { DataGrid } from "@mui/x-data-grid";

const columns = [
  { field: "url", headerName: "Site", width: 300 },
  { field: "created", headerName: "Started", width: 150 },
  { field: "duration", headerName: "Duration", width: 150 },
];

const FullDayLog = (props: { records: TrackInfoRecord[] }) => {
  const { records } = props;
  const rows = React.useMemo(
    () =>
      records.map((rec, idx) => {
        const nextRow = idx !== records.length - 1 ? records[idx + 1] : null;
        const duration: Duration | null = nextRow
          ? dateDiff(nextRow.created, rec.created)
          : (((new Date() as any) - (rec.created as any)) as any);
        const durationD = new Date(duration);
        const durationS = toDuration(durationD);
        return {
          ...rec,
          created: dateFormatHMS(rec.created),
          id: rec.created.getTime(),
          duration: durationS,
        };
      }),
    [records]
  );
  return (
    <div className="day-log">
      <DataGrid rows={rows} columns={columns} checkboxSelection />
    </div>
  );
};

export default FullDayLog;
