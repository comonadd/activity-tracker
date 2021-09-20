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
  useTrackedItemsPaginatedByDay,
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
import HistoryCalendar from "./HistoryCalendar";
import DashboardContext from "./DashboardContext";
import FullHistoryList from "./FullHistoryList";

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

  return (
    <DashboardContext.Provider value={{}}>
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
                    onClick={() => history.push("/settings/")}
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
                    <MenuIcon />
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
