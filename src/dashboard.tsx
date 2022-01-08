import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom";
import { useExtStorage, LStatus } from "./util";
import { DEFAULT_CONFIG } from "./constants";
import {
  useLocation,
  matchLocation,
  RouteMatcher,
  RouterContext,
  RouteParams,
} from "./routeManager";
import Page from "~/components/Page";
import AppContext from "~/AppContext";
import { Configuration } from "~/configuration";
import { AppThemeProvider, CircularProgress } from "~/theme";
import { History, createBrowserHistory } from "history";
import "~/dashboard.css";
import "~/common.ts";

const NotFound = () => {
  return <Page title="Not found">Not found</Page>;
};

const ms = 0;
const lazyPage = (fun: any) => {
  return lazy(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
    return await fun();
  });
};

const Dashboard = lazyPage(() => import("~/scenes/Dashboard"));
const YearPage = lazyPage(() => import("~/scenes/YearPage"));
const MonthPage = lazyPage(() => import("~/scenes/MonthPage"));
const DayPage = lazyPage(() => import("~/scenes/DayPage"));

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

const AppLoader = () => {
  return (
    <div className="app-loader">
      <CircularProgress />
    </div>
  );
};

const App = () => {
  const location = useLocation();
  const [config, setConfig, cStatus] =
    useExtStorage<Configuration<any>>("tracker-config");
  React.useEffect(() => {
    if (cStatus === LStatus.Loaded && config === null) {
      setConfig(DEFAULT_CONFIG);
    }
  }, [config, cStatus]);
  const componentToRender = matchLocation(routeMatcher, location);
  return (
    <Router history={history}>
      <AppContext.Provider
        value={{ config: DEFAULT_CONFIG, setConfig: (() => {}) as any }}
      >
        <div className="app">
          <Suspense fallback={<AppLoader />}>
            <AppThemeProvider>{componentToRender}</AppThemeProvider>
          </Suspense>
        </div>
      </AppContext.Provider>
    </Router>
  );
};

const rootElem = document.querySelector("#root");
ReactDOM.render(<App />, rootElem);
