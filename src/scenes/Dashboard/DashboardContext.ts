import { createContext } from "react";
import { TrackedRecordsGrouped } from "~/types";

interface IDashboardContext {}

const DashboardContext = createContext<IDashboardContext>({} as any);

export default DashboardContext;
