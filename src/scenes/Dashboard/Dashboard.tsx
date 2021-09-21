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
  dateFormatHMS,
  unixDuration,
  dateToString,
  LStatus,
  downloadBlob,
} from "~/util";
import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
  DEFAULT_CONFIG,
} from "~/constants";
import {
  DbHandle,
  Configuration,
  TrackInfoRecord,
  TrackedDay,
  TrackedRecordsGrouped,
  DayRecord,
} from "~/types";
import {
  openIDB,
  clearTrackingStorage,
  useIndexedDbGetAllFromStore,
  useIndexedDbGetAllFromStoreByIndex,
  useIndexedDbHandle,
  constructExportData,
  importActivity,
  ExportImportData,
} from "~/db";
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
  Menu,
  MenuItem,
  MenuIcon,
} from "~/theme";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import HistoryCalendar from "./HistoryCalendar";
import DashboardContext from "./DashboardContext";
import FullHistoryList from "./FullHistoryList";
import paths from "~/paths";
import FileSelector from "~/components/FileSelector";

enum Mode {
  Calendar = 0,
  List = 1,
}
const firstViewingMode = Mode.Calendar;
const viewingModesAvailable = Object.keys(Mode).length / 2;

const iconForMode = (viewingMode: Mode) => {
  switch (viewingMode) {
    case Mode.Calendar:
      {
        return <TodayIcon />;
      }
      break;
    case Mode.List:
      {
        return <ListIcon />;
      }
      break;
    default:
      {
        return null;
      }
      break;
  }
};

const Dashboard = () => {
  const { config, setConfig } = useContext(AppContext);
  const [viewingMode, setViewingMode] = useState<Mode>(Mode.Calendar);
  const viewingModeIcon = useMemo(
    () => iconForMode(viewingMode),
    [viewingMode]
  );
  const toggleViewingMode = () => {
    let next = (viewingMode as number) + 1;
    if (next >= viewingModesAvailable) next = firstViewingMode;
    setViewingMode(next);
  };

  const historyRendered = useMemo(() => {
    if (config === null) {
      console.error("Configuration is null");
      return null;
    }
    switch (viewingMode) {
      case Mode.List:
        {
          return <FullHistoryList />;
        }
        break;
      case Mode.Calendar:
        {
          return <HistoryCalendar />;
        }
        break;
      default:
        {
          console.error("Not implemented");
          return null;
        }
        break;
    }
  }, [config, viewingMode]);

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const exportData = async () => {
    const data = await constructExportData();
    const dataS = JSON.stringify(data);
    const blob = new Blob([dataS], { type: "text/json" });
    downloadBlob(blob, "activity-export.json");
  };

  const fileSelector = React.useRef(null);

  const importData = async () => {
    fileSelector.current!.click();
  };

  const onImportData = (files: FileList) => {
    if (files.length <= 0) return;
    const f: File = files[0];
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const data: ExportImportData = JSON.parse(fr.result as any);
        (async () => {
          await importActivity(data);
        })();
      } catch (err) {
        console.error("Failed to parse JSON", err);
      }
    };
    fr.readAsText(f);
  };

  return (
    <DashboardContext.Provider value={{}}>
      <FileSelector onSelected={onImportData} ref={fileSelector} />
      <Page title="Activity Dashboard">
        <div className="dashboard">
          <header className="header df fsb">
            <Typography component="h1" variant="h3">
              Dashboard
            </Typography>
            <div className="dashboard-controls fcv">
              <Grid container spacing={1} className="fcv">
                <Grid item>
                  <IconButton
                    onClick={() => toggleViewingMode()}
                    size="medium"
                    title="Toggle view"
                  >
                    {viewingModeIcon}
                  </IconButton>
                </Grid>
                <Grid item>
                  <IconButton
                    onClick={() => {
                      location.assign(paths.OPTIONS_PAGE);
                    }}
                    size="medium"
                    title="Open settings"
                  >
                    <SettingsIcon />
                  </IconButton>
                </Grid>
                <Grid item>
                  <IconButton
                    id="dashboard-menu-button"
                    aria-controls="dashboard-menu"
                    aria-haspopup="true"
                    aria-expanded={open ? "true" : undefined}
                    onClick={handleClick}
                  >
                    <MoreVertIcon />
                  </IconButton>
                  <Menu
                    id="dashbboard-menu"
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{
                      "aria-labelledby": "dashboard-menu-button",
                    }}
                  >
                    {process.env.NODE_ENV === "development" && (
                      <MenuItem
                        onClick={() => populateStorageWithRandomData(config)}
                      >
                        Populate storage with random data
                      </MenuItem>
                    )}
                    <MenuItem onClick={() => clearTrackingStorage(config)}>
                      Clear storage
                    </MenuItem>
                    <MenuItem onClick={exportData}>Export Data</MenuItem>
                    <MenuItem onClick={importData}>Import Data</MenuItem>
                  </Menu>
                </Grid>
              </Grid>
            </div>
          </header>
          {historyRendered}
        </div>
      </Page>
    </DashboardContext.Provider>
  );
};

export default Dashboard;
