import React, { useContext, useMemo, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useExtStorage } from "./util";
import { Configuration } from "~/configuration";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import "./app.css";
import "./options.css";
import jsonBeautify from "json-beautify";
import { UserLogMessage, clearUserLogs, UserLog } from "~/userLog";
import { recalculateRecordTypes } from "~/trackedRecord";
import FormHelperText from "@material-ui/core/FormHelperText";
import paths from "~/paths";
import AppContext from "~/AppContext";
import CircularProgress from "@material-ui/core/CircularProgress";
import { AppThemeProvider, Link, Breadcrumbs } from "~/theme";
import { DataGrid } from "@mui/x-data-grid";
import Page from "~/components/Page";

const ConfigEditor = () => {
  const { config, setConfig } = useContext(AppContext);
  const [error, setError] = useState(null);
  const [initialConfigS, setInitialConfigS] = useState<string>("");
  const [configS, setConfigS] = useState<string>("");
  useEffect(() => {
    const jsonS = jsonBeautify(config, null, 2, 100);
    setInitialConfigS(jsonS);
    setConfigS(jsonS);
  }, [config]);

  const [saving, setSaving] = useState(false);
  const [savingStep, setSavingStep] = useState<string | null>(null);
  const [totalRecordsToProcess, setTotalRecordsToProcess] =
    useState<number>(-1);
  const [processedRecords, setProcessedRecords] = useState<number>(0);
  const recalc = async () => {
    setSaving(true);
    let k = 0;
    const UI_UPDATE_INTERVAL = 250;
    const it = recalculateRecordTypes(config);
    for await (const [processed, total] of it) {
      if (k >= UI_UPDATE_INTERVAL) {
        setTotalRecordsToProcess(total);
        setProcessedRecords(processed);
        setSavingStep(`Recalculating record types (${processed}/${total})...`);
        k = 0;
      } else {
        ++k;
      }
    }
    setTotalRecordsToProcess(-1);
    setProcessedRecords(0);
    setSaving(false);
    setSavingStep(null);
    setError(null);
  };

  const save = () => {
    try {
      const c = JSON.parse(configS);
      if (c) {
        setConfig(c);
        recalc();
      }
    } catch (err) {
      setError(err);
    }
  };

  const didSomethingChange = React.useMemo(
    () => initialConfigS !== configS,
    [initialConfigS, configS]
  );

  const renderedHeader = useMemo(() => {
    const processedRecordsPerc =
      totalRecordsToProcess === -1
        ? -1
        : Math.round((processedRecords / totalRecordsToProcess) * 100);
    return (
      <header className="pv-2">
        <div className="df fsb fcv">
          <div className="df">
            <Typography component="h1" variant="h5">
              Config editor
            </Typography>
          </div>
          <div className="editor-controls">
            <Button
              color="primary"
              onClick={save}
              disabled={saving || !didSomethingChange}
            >
              <span>Save configuration</span>
            </Button>
          </div>
        </div>
        {saving && (
          <div className="df fcv mt-1">
            {processedRecordsPerc !== -1 && (
              <CircularProgress
                variant="determinate"
                size={24}
                thickness={4}
                value={processedRecordsPerc}
              />
            )}
            <span className="ml-4 fs-14">
              {savingStep !== null ? savingStep : "Saving..."}
            </span>
          </div>
        )}
      </header>
    );
  }, [
    totalRecordsToProcess,
    processedRecords,
    saving,
    savingStep,
    didSomethingChange,
  ]);

  return (
    <div className="config-editor mb-4">
      {renderedHeader}
      {error !== null && <FormHelperText error>{error.message}</FormHelperText>}
      <TextField
        spellCheck={false}
        className="editor"
        multiline
        fullWidth
        value={configS}
        onChange={(e) => setConfigS(e.target.value)}
        variant="outlined"
        inputProps={{
          className: "editor-textarea",
        }}
      />
    </div>
  );
};

const logsPerPage = 20;
const columns = [
  { field: "created", headerName: "Date", width: 150 },
  { field: "msg", headerName: "Message", width: 400 },
];

const LogsDisplay = () => {
  const [logs, setLogs] = useState<UserLogMessage[]>([]);
  const fetchLogs = async (timestamp: Date) => {
    const result = await UserLog.query()
      .byIndex("created")
      .from(timestamp)
      .take(logsPerPage)
      .all();
    setLogs(result);
  };

  useEffect(() => {
    fetchLogs(new Date(0));
  }, []);

  const clearLogs = () => {
    (async () => {
      await clearUserLogs();
      setLogs([]);
    })();
  };

  const logsRendered = useMemo(() => {
    if (logs === null) return [];
    if (logs.length === 0) {
      return <div className="pv-8">No logs found</div>;
    }
    return (
      <div className="logs-list">
        <DataGrid rows={logs} columns={columns} checkboxSelection />
      </div>
    );
  }, [logs]);

  return (
    <div className="logs">
      <Grid container>
        <Grid item xs={12}>
          <div className="df fsb fcv pv-2">
            <Typography component="h1" variant="h5">
              Logs
            </Typography>
            <Button color="secondary" onClick={clearLogs}>
              Clear Logs
            </Button>
          </div>
        </Grid>
        <Grid item xs={12}>
          {logsRendered}
        </Grid>
      </Grid>
    </div>
  );
};

const OptionsPage = () => {
  const [config, setConfig] =
    useExtStorage<Configuration<any>>("tracker-config");
  return (
    <AppContext.Provider value={{ config, setConfig }}>
      <AppThemeProvider>
        <div className="app">
          <Page title="Options" className="config-page">
            <Breadcrumbs aria-label="breadcrumb">
              <Link href={paths.DASHBOARD_PAGE}>Dashboard</Link>
            </Breadcrumbs>
            <Typography component="h1" variant="h3">
              Options
            </Typography>
            <ConfigEditor />
            <LogsDisplay />
          </Page>
        </div>
      </AppThemeProvider>
    </AppContext.Provider>
  );
};

const rootElem = document.querySelector("#root");
ReactDOM.render(<OptionsPage />, rootElem);
