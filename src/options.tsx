import React, { useMemo, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  calcProductivityLevelForDay,
  rewardForActivityType,
  useExtStorage,
  dateToString,
} from "./util";
import { Configuration } from "./types";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import "./app.css";
import "./options.css";
import jsonBeautify from "json-beautify";
import {
  UserLogMessage,
  clearUserLogs,
  useIndexedDbHandle,
  UserLog,
} from "./db";
import FormHelperText from "@material-ui/core/FormHelperText";

const logsPerPage = 20;

const OptionsPage = () => {
  const [config, setConfig] =
    useExtStorage<Configuration<any>>("tracker-config");
  const [configS, setConfigS] = useState<string>("");
  useEffect(() => {
    setConfigS(jsonBeautify(config, null, 2, 100));
  }, [config]);
  const [error, setError] = useState(null);
  const save = () => {
    try {
      const c = JSON.parse(configS);
      if (c) {
        setConfig(c);
      }
      setError(null);
    } catch (err) {
      setError(err);
    }
  };
  const db = useIndexedDbHandle();
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
      await clearUserLogs(db);
      const lastLogTimestamp = logs[logs.length - 1].created;
      setLogs([]);
    })();
  };

  const logsRendered = useMemo(() => {
    if (logs === null) return [];
    if (logs.length === 0) {
      return <div className="pv-8">No logs found</div>;
    }
    return logs.map((log) => {
      return (
        <div
          key={log.created.getTime()}
          className="logs__item"
        >{`[${dateToString(log.created)}]: ${log.msg}`}</div>
      );
    });
  }, [logs]);

  return (
    <div className="config-page">
      <div className="config-editor mb-4">
        <div className="df fsb fcv pv-2">
          <Typography component="h1" variant="h5">
            Config editor
          </Typography>
          <div className="editor-controls">
            <Button color="primary" onClick={save}>
              Save configuration
            </Button>
          </div>
        </div>
        {error !== null && (
          <FormHelperText error>{error.message}</FormHelperText>
        )}
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
            <div className="logs-list">{logsRendered}</div>
          </Grid>
        </Grid>
      </div>
    </div>
  );
};

const rootElem = document.querySelector("#root");
ReactDOM.render(<OptionsPage />, rootElem);
