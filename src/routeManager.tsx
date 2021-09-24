import React, { useState, createContext } from "react";
import { createHashHistory, Location } from "history";
export { Location } from "history";

export type RouteParams = Record<string, string>;
export interface IRouterContext {
  params: RouteParams;
}
export const RouterContext = createContext<IRouterContext>({ params: {} });
// Return all parameters for the current route
export function useParams<T>(): T {
  const { params } = React.useContext(RouterContext);
  return params as any as T;
}

export const history = createHashHistory();

export type RouteMatcher = [RegExp, (...args: any[]) => any][];

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
  for (let pair of config) {
    const r = pair[0];
    if (new RegExp(r).test(p)) {
      // matches
      const mm = p.matchAll(new RegExp(r));
      let m = [...mm][0];
      let params = m || [];
      delete params["index"];
      delete params["input"];
      delete params["groups"];
      params = params.slice(1);
      const c = pair[1];
      return c(params);
    }
  }
  return () => null as any;
};

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
