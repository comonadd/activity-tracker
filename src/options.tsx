import React, { useMemo, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  calcProductivityLevelForDay,
  rewardForActivityType,
  useChromeStorage,
} from "./util";
import { Configuration } from "./types";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import "./app.css";
import "./options.css";
import jsonBeautify from "json-beautify";
import { clearUserLogs, useIndexedDbHandle, allUserLogsSorted } from "./db";
import FormHelperText from "@material-ui/core/FormHelperText";

const OptionsPage = () => {
  const [config, setConfig] =
    useChromeStorage<Configuration<any>>("tracker-config");
  console.log(config);
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
    } catch (err) {
      setError(err);
    }
  };
  const db = useIndexedDbHandle();
  const [logs, refreshLogs] = allUserLogsSorted(db);
  const logsRendered = useMemo(() => {
    if (logs === null) return [];
    return logs.map((log) => {
      return (
        <div
          key={log.created.getTime()}
          className="logs__item"
        >{`[${log.created.toString()}]: ${log.msg}`}</div>
      );
    });
  }, [logs]);
  const clearLogs = () => {
    (async () => {
      await clearUserLogs(db);
      await refreshLogs();
    })();
  };
  return (
    <div className="config-page">
      <div className="config-editor">
        <Typography component="h1" variant="h5">
          Config editor
        </Typography>
        {error !== null && (
          <FormHelperText error>{error.message}</FormHelperText>
        )}
        <TextField
          className="edit-area"
          multiline
          fullWidth
          value={configS}
          onChange={(e) => setConfigS(e.target.value)}
        />
        <div className="editor-controls">
          <Button color="primary" onClick={save}>
            Save configuration
          </Button>
        </div>
      </div>
      <div className="logs">
        <Typography component="h1" variant="h5">
          Logs
        </Typography>
        <Button color="secondary" onClick={clearLogs}>
          Clear Logs
        </Button>
        <div className="logs-list">{logsRendered}</div>
      </div>
    </div>
  );
};

const rootElem = document.querySelector("#root");
ReactDOM.render(<OptionsPage />, rootElem);
