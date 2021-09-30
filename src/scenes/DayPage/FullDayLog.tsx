import React from "react";
import {
  TrackedRecord,
  recDurationAtIndex,
  TrackInfoRecord,
} from "~/trackedRecord";
import { dateFormatHMS } from "~/dates";
import { DataGrid, GridAlignment } from "@mui/x-data-grid";
import { formatDistance } from "date-fns";
import { Button } from "~/theme";

const columns = [
  { field: "url", headerName: "Site", flex: 1, sortable: false },
  {
    field: "created",
    headerName: "Started",
    width: 140,
    headerAlign: "left" as GridAlignment,
    align: "left" as GridAlignment,
    sortable: false,
  },
  {
    field: "duration",
    headerName: "Duration",
    width: 140,
    headerAlign: "left" as GridAlignment,
    align: "left" as GridAlignment,
  },
];

const FullDayLog = (props: {
  refresh: () => Promise<void>;
  loading: boolean;
  records: TrackInfoRecord[];
}) => {
  const { records } = props;
  const [selectionModel, setSelectionModel] = React.useState([]);
  const rows = React.useMemo(
    () =>
      records.map((rec, idx) => {
        const nextRow = idx !== records.length - 1 ? records[idx + 1] : null;
        const duration = recDurationAtIndex(props.records, idx);
        const durationD = new Date(duration);
        return {
          ...rec,
          created: dateFormatHMS(rec.created),
          id: rec.id,
          duration: formatDistance(0, duration, {
            includeSeconds: true,
          }),
        };
      }),
    [records]
  );
  const deleteSelected = async () => {
    const tx = TrackedRecord.createTransaction("readwrite");
    await TrackedRecord.deleteMany(selectionModel);
    await props.refresh();
  };
  return (
    <div className="day-log">
      <div className="df frr mb-4">
        <Button disabled={selectionModel.length === 0} onClick={deleteSelected}>
          Delete
        </Button>
      </div>
      <DataGrid
        rows={rows}
        columns={columns}
        autoHeight
        loading={props.loading}
        checkboxSelection
        onSelectionModelChange={(newSelectionModel) => {
          setSelectionModel(newSelectionModel);
        }}
        selectionModel={selectionModel}
      />
    </div>
  );
};

export default FullDayLog;
