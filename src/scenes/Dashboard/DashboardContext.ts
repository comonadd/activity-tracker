import { createContext } from "react";
import { TrackedRecordsGrouped } from "~/trackedRecord";

interface IDashboardContext {}

const DashboardContext = createContext<IDashboardContext>({} as any);

export default DashboardContext;
