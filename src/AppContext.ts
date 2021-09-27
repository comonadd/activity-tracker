import { Configuration } from "~/configuration";
import { createContext } from "react";

export interface IAppContext {
  config: Configuration<any>;
  setConfig: (s: Configuration<any>) => void;
}
export const AppContext = createContext<IAppContext>({} as any);
export default AppContext;
