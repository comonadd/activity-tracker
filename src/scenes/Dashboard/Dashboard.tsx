import React, { useMemo, useContext, useState } from "react";
import { populateStorageWithRandomData, downloadBlob } from "~/util";
import {
  clearTrackingStorage,
  constructExportData,
  importActivity,
  ExportImportData,
} from "~/activity";
import Page from "~/components/Page";
import AppContext from "~/AppContext";
import {
  IconButton,
  SettingsIcon,
  Typography,
  ListIcon,
  TodayIcon,
  Grid,
  Menu,
  MenuItem,
} from "~/theme";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import HistoryCalendar from "./HistoryCalendar";
import DashboardContext from "./DashboardContext";
import FullHistoryList from "./FullHistoryList";
import paths from "~/paths";
import FileSelector from "~/components/FileSelector";
import ConfirmDialog from "~/components/ConfirmDialog";

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
  const [populatingStorage, setPopulatingStorage] = useState(false);
  const [clearStorageConfirmationShown, setOpenClearStorageConfirmation] =
    useState(false);

  return (
    <DashboardContext.Provider value={{}}>
      <ConfirmDialog
        shown={clearStorageConfirmationShown}
        onConfirm={() => clearTrackingStorage()}
        onClose={() => setOpenClearStorageConfirmation(false)}
        text="Do you really want to delete all of your tracked data?"
      />
      <FileSelector onSelected={onImportData} ref={fileSelector} />
      <Page title="Activity Dashboard">
        <div className="dashboard">
          <header className="header df fsb">
            <Typography component="h1" variant="h3">
              My Activity
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
                        onClick={() => {
                          (async () => {
                            setPopulatingStorage(true);
                            await populateStorageWithRandomData(config);
                            setPopulatingStorage(false);
                          })();
                        }}
                        disabled={populatingStorage}
                      >
                        Populate storage with random data
                      </MenuItem>
                    )}
                    <MenuItem
                      onClick={() => setOpenClearStorageConfirmation(true)}
                    >
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
