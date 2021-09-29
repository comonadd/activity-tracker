import React, { useState, createContext } from "react";
import { History, createHashHistory, Location } from "history";

export type RouteParams = Record<string, string>;
export interface IRouterContext {
  params: RouteParams;
  history: History;
}
export const RouterContext = createContext<IRouterContext>({
  params: {},
  history: null,
});
// Return all parameters for the current route
export function useParams<T>(): T {
  const { params } = React.useContext(RouterContext);
  return params as any as T;
}

export const history = createHashHistory();

type QueryParams = Record<string, string> | undefined;

export type RouteMatcher = [
  RegExp,
  (params: any[], qryParams: QueryParams) => any
][];

const parseQueryParams = (loc: Location): QueryParams =>
  loc.search.length === 0
    ? undefined
    : loc.search
        .substr(1)
        .split("&")
        .reduce((acc, p) => {
          const [key, value] = p.split("=");
          acc[key] = value;
          return acc;
        }, {} as QueryParams);

export const matchLocation = (
  config: RouteMatcher,
  loc: Location | null
): any | null => {
  if (loc === null) return null;
  let p = "";
  if (loc["key"] !== undefined) {
    // history module location
    p = loc.pathname;
  } else {
    if (loc.hash.length === 0) {
      p = "/";
    } else {
      p = loc.hash.substr(1, loc.hash.length);
    }
  }
  const qryParams: QueryParams = parseQueryParams(loc);
  for (const pair of config) {
    const r = pair[0];
    if (new RegExp(r).test(p)) {
      // matches
      const mm = p.matchAll(new RegExp(r));
      const m = [...mm][0];
      let params = m || [];
      delete params["index"];
      delete params["input"];
      delete params["groups"];
      params = params.slice(1);
      const c = pair[1];
      return c(params, qryParams);
    }
  }
  return () => null as any;
};

function constructQueryParamsString(qParams: QueryParams): string {
  let p = "";
  const keys = Object.keys(qParams);
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    const value = qParams[key];
    p += `${key}=${value}${i !== keys.length - 1 ? "&" : ""}`;
  }
  return `?${p}`;
}

function updateQueryParams(loc: Location, key: string, value: string): string {
  const qParams = parseQueryParams(loc) ?? {};
  qParams[key] = value;
  const newLoc = new URL(loc as any);
  newLoc.search = constructQueryParamsString(qParams);
  return newLoc.href;
}

export function useQueryParam<T>(
  key: string,
  initialValue: T
): [T, (v: T) => void] {
  const { history } = React.useContext(RouterContext);
  const location = window.location;
  const qParams: QueryParams = parseQueryParams(location as any) ?? {};
  const getInitialValue = (): T => {
    if (qParams[key]) return JSON.parse(qParams[key]);
    return initialValue;
  };
  const [currValue, setCurrValue] = useState<T>(getInitialValue());
  React.useEffect(() => {
    const newValue = JSON.stringify(currValue);
    if (qParams[key] === newValue) return;
    (history as any).push(updateQueryParams(location as any, key, newValue));
  }, [currValue]);
  return [currValue, setCurrValue];
}

export const useLocation = (): Location => {
  const [location, setLocation] = useState<Location>(window.location as any);
  React.useEffect(() => {
    history.listen((update) => {
      setLocation(update.location);
    });
  }, []);
  return location;
};

export const Link = React.forwardRef(
  (props: { to: string; children: any } & any, ref) => {
    return (
      <a
        ref={ref}
        href={props.to}
        {...props}
        onClick={(e) => {
          e.preventDefault();
          history.push(props.to);
        }}
      >
        {props.children}
      </a>
    );
  }
);
