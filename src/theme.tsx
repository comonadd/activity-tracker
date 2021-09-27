export { default as Button } from "@material-ui/core/Button";
export { default as IconButton } from "@material-ui/core/IconButton";
export { default as Accordion } from "@material-ui/core/Accordion";
export { default as Grid } from "@material-ui/core/Grid";
export { default as AccordionSummary } from "@material-ui/core/AccordionSummary";
export { default as Breadcrumbs } from "@material-ui/core/Breadcrumbs";
export { default as Card } from "@material-ui/core/Card";
export { default as Paper } from "@material-ui/core/Paper";
export { default as AccordionDetails } from "@material-ui/core/AccordionDetails";
export { default as Typography } from "@material-ui/core/Typography";
export { default as ExpandMoreIcon } from "@material-ui/icons/ExpandMore";
export { default as TodayIcon } from "@material-ui/icons/Today";
export { default as SettingsIcon } from "@material-ui/icons/Settings";
export { default as ListIcon } from "@material-ui/icons/List";
export { default as Menu } from "@material-ui/core/Menu";
export { default as MenuItem } from "@material-ui/core/MenuItem";
export { default as MenuIcon } from "@material-ui/icons/Menu";
export { default as Tabs } from "@material-ui/core/Tabs";
export { default as Tab } from "@material-ui/core/Tab";
export { default as Link } from "@material-ui/core/Link";
export { default as Tooltip } from "@material-ui/core/Tooltip";
export { default as Checkbox } from "@material-ui/core/Checkbox";
import {
  useTheme as useMuiTheme,
  createTheme,
  ThemeProvider,
} from "@material-ui/core/styles";
import { Theme } from "@material-ui/core/styles";
import React from "react";
import { Configuration } from "~/configuration";
import AppContext from "~/AppContext";

interface AppTheme extends Theme {
  prodGraphFillColor: string;
  prodBarLowColor: string;
  prodBarHighColor: string;
}

export const useTheme = (): AppTheme => useMuiTheme() as any as AppTheme;

const muiThemeFromConfig = (config: Configuration<any>) =>
  createTheme({
    palette: { primary: { main: "#2a9d8f" }, secondary: { main: "#e9c46a" } },
    prodGraphFillColor: "#264653",
    prodBarLowColor: "#e0ff4f",
    prodBarHighColor: "#00272b",
  } as any) as AppTheme;

export const AppThemeProvider = (props: { children: React.ReactElement }) => {
  const { config } = React.useContext(AppContext);
  const theme = React.useMemo(() => {
    return muiThemeFromConfig(config);
  }, [config]);
  return <ThemeProvider theme={theme}>{props.children}</ThemeProvider>;
};

// Colors
export const DEFAULT_ACTIVITY_COLOR = "#00ff00";
