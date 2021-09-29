import React from "react";
import ReactDOM from "react-dom";
import { useExtStorage, LStatus } from "./util";
import { DEFAULT_CONFIG } from "./constants";
import "./app.css";
import "./dashboard.css";
import {
  useLocation,
  matchLocation,
  RouteMatcher,
  RouterContext,
  RouteParams,
} from "./routeManager";
import Page from "~/components/Page";
import AppContext from "~/AppContext";
import DayPage from "~/scenes/DayPage";
import YearPage from "~/scenes/YearPage";
import MonthPage from "~/scenes/MonthPage";
import Dashboard from "~/scenes/Dashboard";
import { Configuration } from "~/configuration";
import { AppThemeProvider } from "~/theme";
import "~/app.css";
import "~/dashboard.css";
import { History, createBrowserHistory } from "history";

const NotFound = () => {
  return <Page title="Not found">Not found</Page>;
};

const routeMatcher: RouteMatcher = [
  [
    /^\/$/g,
    (_, qryParams = {}) => (
      <Dashboard page={qryParams.page ? parseInt(qryParams.page) : undefined} />
    ),
  ],
  [/^\/(\d+)\/(\d+)\/?$/g, () => <YearPage />],
  [/^\/(\d+)\/(\d+)\/?$/g, () => <MonthPage />],
  [
    /^\/(\d+)\/(\d+)\/(\d+)\/?$/g,
    ([year, month, day]) => <DayPage year={year} month={month} day={day} />,
  ],
  [/.*/g, () => <NotFound />],
];

const Router = (props: { children: React.ReactElement; history: History }) => {
  const [currRouteParams, setCurrRouteParams] = React.useState<RouteParams>({});
  return (
    <RouterContext.Provider
      value={{ params: currRouteParams, history: props.history }}
    >
      {props.children}
    </RouterContext.Provider>
  );
};

const history = createBrowserHistory();

const App = () => {
  const location = useLocation();
  const [config, setConfig, cStatus] =
    useExtStorage<Configuration<any>>("tracker-config");
  React.useEffect(() => {
    if (cStatus === LStatus.Loaded && config === null) {
      setConfig(DEFAULT_CONFIG);
    }
  }, [config, cStatus]);
  if (cStatus === LStatus.Loading) return null;
  const componentToRender = matchLocation(routeMatcher, location);
  return (
    <Router history={history}>
      <AppContext.Provider value={{ config, setConfig }}>
        <AppThemeProvider>
          <div className="app">{componentToRender}</div>
        </AppThemeProvider>
      </AppContext.Provider>
    </Router>
  );
};

const rootElem = document.querySelector("#root");
ReactDOM.render(<App />, rootElem);
