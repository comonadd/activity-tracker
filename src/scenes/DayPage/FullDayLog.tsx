import React from "react";
import {
  TrackedRecord,
  recDurationAtIndex,
  TrackInfoRecord,
} from "~/trackedRecord";
import { dateFormatHMS } from "~/dates";
import { DataGrid, GridAlignment } from "@mui/x-data-grid";
import { formatDistance } from "date-fns";
import { Typography, Button } from "~/theme";

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
    width: 180,
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
        const duration = recDurationAtIndex(props.records, idx, null);
        const durS =
          duration !== null
            ? formatDistance(0, duration, {
                includeSeconds: true,
              })
            : "N/A";
        return {
          ...rec,
          created: dateFormatHMS(rec.created),
          id: rec.id,
          duration: durS,
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
      <div className="df mb-4 fsb">
        <Typography component="h1" variant="h5">
          History
        </Typography>
        <Button
          disabled={selectionModel.length === 0}
          onClick={deleteSelected}
          size="large"
        >
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
