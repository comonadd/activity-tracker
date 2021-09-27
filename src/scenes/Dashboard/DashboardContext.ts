import { createContext } from "react";

interface IDashboardContext {}

const DashboardContext = createContext<IDashboardContext>({} as any);

export default DashboardContext;
