export { default as Button } from "@mui/material/Button";
export { default as IconButton } from "@mui/material/IconButton";
export { default as Accordion } from "@mui/material/Accordion";
export { default as Grid } from "@mui/material/Grid";
export { default as AccordionSummary } from "@mui/material/AccordionSummary";
export { default as Card } from "@mui/material/Card";
export { default as CardActions } from "@mui/material/CardActions";
export { default as CardHeader } from "@mui/material/CardHeader";
export { default as CardContent } from "@mui/material/CardContent";
export { default as Paper } from "@mui/material/Paper";
export { default as AccordionDetails } from "@mui/material/AccordionDetails";
export { default as Typography } from "@mui/material/Typography";
export { default as ExpandMoreIcon } from "@mui/icons-material/ExpandMore";
export { default as TodayIcon } from "@mui/icons-material/Today";
export { default as SettingsIcon } from "@mui/icons-material/Settings";
export { default as ListIcon } from "@mui/icons-material/List";
export { default as Menu } from "@mui/material/Menu";
export { default as MenuItem } from "@mui/material/MenuItem";
export { default as MenuIcon } from "@mui/icons-material/Menu";
export { default as Tabs } from "@mui/material/Tabs";
export { default as Tab } from "@mui/material/Tab";
export { default as Link } from "@mui/material/Link";
export { default as Tooltip } from "@mui/material/Tooltip";
export { default as CircularProgress } from "@mui/material/CircularProgress";
export { default as Checkbox } from "@mui/material/Checkbox";
import {
  useTheme as useMuiTheme,
  createTheme,
  ThemeProvider,
  styled,
} from "@mui/material/styles";
import { Theme } from "@mui/material/styles";
import React from "react";
import { Configuration } from "~/configuration";
import AppContext from "~/AppContext";
import { RGB } from "~/util";

interface AppTheme extends Theme {
  prodGraphFillColor: string;
  prodBarLowColor: string;
  prodBarHighColor: string;
  lowColor: RGB;
  highColor: RGB;
}

export const useTheme = (): AppTheme => useMuiTheme() as any as AppTheme;

const hexToRGB = (hex: string): RGB => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

const muiThemeFromConfig = (config: Configuration<any>) =>
  createTheme({
    palette: { primary: { main: "#0987A0" }, secondary: { main: "#9F7AEA" } },
    action: {
      active: { main: "#03045e" },
      activeOpacity: 1,
    },

    // Productivity bar colors
    prodGraphFillColor: "#264653",
    prodBarLowColor: "#C4F1F9",
    prodBarHighColor: "#065666",

    // Dashboard colors
    lowColor: hexToRGB("#E9D8FD"),
    highColor: hexToRGB("#322659"),
  } as any) as AppTheme;

export const AppThemeProvider = (props: { children: React.ReactElement }) => {
  const { config } = React.useContext(AppContext);
  const theme = React.useMemo(() => {
    return muiThemeFromConfig(config);
  }, [config]);
  return <ThemeProvider theme={theme}>{props.children}</ThemeProvider>;
};

// Colors
export const DEFAULT_ACTIVITY_COLOR = "#805AD5";

export enum Size {
  Small = 0,
  Medium = 1,
  Large = 2,
}

import MUIBreadcrumbs from "@mui/material/Breadcrumbs";

export const Breadcrumbs = styled(MUIBreadcrumbs)({
  fontSize: 14,
});
