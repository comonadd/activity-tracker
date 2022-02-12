import React, {
  useContext,
  useMemo,
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import ReactDOM from "react-dom";
import { useExtStorage } from "./util";
import { DEFAULT_CONFIG, Configuration } from "~/configuration";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import "./app.scss";
import "./options.scss";
import jsonBeautify from "json-beautify";
import { UserLogMessage, clearUserLogs, UserLog } from "~/userLog";
import { recalculateRecordTypes } from "~/trackedRecord";
import FormHelperText from "@mui/material/FormHelperText";
import paths from "~/paths";
import AppContext from "~/AppContext";
import CircularProgress from "@mui/material/CircularProgress";
import { IconButton, AppThemeProvider, Link } from "~/theme";
import { GridColumns, DataGrid } from "@mui/x-data-grid";
import Page from "~/components/Page";
import { dateToString } from "~/dates";
import ConfirmDialog from "~/components/ConfirmDialog";
import Replay from "@mui/icons-material/Replay";
import BreadcrumbsForPath from "./components/BreadcrumbsForPath";
import CodeMirror, { EditorEventMap, EditorFromTextArea } from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript.js";
import "codemirror/theme/idea.css";
import debounce from "@mui/utils/debounce";

const ConfigEditor = () => {
  const { config, setConfig } = useContext(AppContext);
  const [error, setError] = useState(null);
  const [initialConfigS, setInitialConfigS] = useState<string>("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configS, setConfigS] = useState<string>("");
  useEffect(() => {
    const jsonS = jsonBeautify(config, null, 2, 100);
    setInitialConfigS(jsonS);
    setConfigS(jsonS);
    if (jsonS === "null") return;
    console.log("loaded", jsonS);
    setLoadingConfig(false);
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
  };

  const save = async () => {
    try {
      const c = JSON.parse(configS);
      if (c) {
        setConfig(c);
        setError(null);
        await recalc();
      }
    } catch (err) {
      setError(err);
    }
  };

  const didSomethingChange = React.useMemo(
    () => initialConfigS !== configS,
    [initialConfigS, configS]
  );

  const resetConfiguration = () => {
    setConfig(DEFAULT_CONFIG);
  };
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);
  const startResetConfiguration = () => setResetConfirmOpen(true);
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
              Configuration
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
            <IconButton
              onClick={startResetConfiguration}
              size="medium"
              title="Reset configuration"
            >
              <Replay />
            </IconButton>
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

  type OnChange = EditorEventMap["change"];
  const onChange: OnChange = useCallback(
    debounce((codeMirror, change) => {
      const newValue = codeMirror.getValue();
      setConfigS(newValue);
    }, 500),
    []
  );

  // Setup codemirror
  const textArea = useRef(null);
  const codeMirror = useRef(null);
  useLayoutEffect(() => {
    if (loadingConfig) return;
    if (textArea.current === null) return;
    const myCodeMirror: EditorFromTextArea = CodeMirror.fromTextArea(
      textArea.current,
      {
        value: configS,
        mode: {
          name: "javascript",
          jsonld: true,
          json: true,
        },
        tabSize: 2,
        spellcheck: true,
        theme: "idea",
      }
    );
    codeMirror.current = myCodeMirror;
    myCodeMirror.on("change", onChange);
  }, [loadingConfig]);

  // useEffect(() => {
  //   const editor = codeMirror.current;
  //   editor.getDoc().setValue(configS);
  // }, [configS]);

  if (loadingConfig) return null;

  return (
    <div className="config-editor mb-8">
      <ConfirmDialog
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          resetConfiguration();
        }}
        shown={resetConfirmOpen}
        text="Do you really want to reset configuration to it's original state?"
      />
      {renderedHeader}
      {error !== null && <FormHelperText error>{error.message}</FormHelperText>}
      <div className="editor">
        <textarea
          spellCheck={false}
          defaultValue={configS}
          className="editor-textarea"
          ref={textArea}
        />
      </div>
    </div>
  );
};

const logsPerPage = 10;
const columns: GridColumns = [
  {
    field: "created",
    headerName: "Date",
    width: 140,
    align: "left",
    headerAlign: "left",
  },
  {
    field: "msg",
    headerName: "Message",
    flex: 100,
    align: "left",
    headerAlign: "left",
    sortable: false,
  },
];

const LogsDisplay = () => {
  const [logs, setLogs] = useState<UserLogMessage[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const fetchLogs = async (timestamp: Date, page: number) => {
    setLoading(true);
    const result = await UserLog.query()
      .byIndex("created")
      .offset(logsPerPage * page)
      .from(timestamp)
      .take(logsPerPage)
      .all();
    setLogs(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs(new Date(0), page);
  }, [page]);

  useEffect(() => {
    (async () => {
      const total = await UserLog.query().count();
      setTotalLogs(total);
    })();
  }, []);

  const clearLogs = () => {
    (async () => {
      await clearUserLogs();
      setLogs([]);
    })();
  };

  const rows = useMemo(
    () => logs.map((log) => ({ ...log, created: dateToString(log.created) })),
    [logs]
  );

  const logsRendered = useMemo(() => {
    if (rows.length === 0 && !loading) {
      return <div className="pv-8">No logs found</div>;
    }
    return (
      <div className="logs-list">
        <DataGrid
          disableSelectionOnClick
          rows={rows}
          columns={columns}
          page={page}
          rowHeight={60}
          onPageChange={(newPage) => setPage(newPage)}
          pageSize={logsPerPage}
          rowsPerPageOptions={[logsPerPage]}
          pagination
          paginationMode="server"
          autoHeight
          rowCount={totalLogs}
          density="compact"
          loading={loading}
        />
      </div>
    );
  }, [loading, rows, totalLogs, page]);

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
            <BreadcrumbsForPath
              path={[
                {
                  text: "Dashboard",
                  path: paths.DASHBOARD_PAGE,
                  external: true,
                },
                { text: "Options", path: "#", disabled: true },
              ]}
            />
            <Typography component="h1" variant="h4" className="mb-4">
              Options
            </Typography>
            <div className="lg-w-half w-full">
              <Typography component="p" color="textSecondary" className="fs-14">
                You can configure your activity matchers here. After saving, the
                records will be updated automatically. "activityTypes" defines
                the activity types and their value. "matcher" maps the website
                domain to a particular activity type.
              </Typography>
            </div>
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
