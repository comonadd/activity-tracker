import React, { useEffect, useState, useContext } from "react";
import Page from "~/components/Page";
import { Link as RLink } from "~/routeManager";
import { TrackInfoRecord, allRecordsForDay } from "~/trackedRecord";
import { Link, Tabs, Tab, Typography, Breadcrumbs } from "~/theme";
import AppContext from "~/AppContext";
import { calcProductivityLevelForDay } from "~/util";
import { dateToString } from "~/dates";
import ProductivityLevel from "~/components/ProductivityLevel";
import TopSites from "./TopSites";
import FullDayLog from "./FullDayLog";
import DayGraph from "./DayGraph";

interface DayPageProps {
  year: string;
  month: string;
  day: string;
}

const TabPanel = (props: {
  value: number;
  index: number;
  children: React.ReactElement;
}) => {
  return (
    <div className="tab-container h-100" hidden={props.index !== props.value}>
      {props.children}
    </div>
  );
};

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const DayPage = (props: DayPageProps) => {
  const { year, month, day } = props;
  const { config } = useContext(AppContext);
  const [records, setRecords] = useState<TrackInfoRecord[]>([]);
  const dayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const prodLevel = calcProductivityLevelForDay(config, records);
  useEffect(() => {
    (async () => {
      const res = await allRecordsForDay(dayDate);
      setRecords(res);
    })();
  }, []);
  const [currTab, setCurrTab] = React.useState<number>(0);

  const handleChange = (event: React.SyntheticEvent<any>, newValue: number) => {
    setCurrTab(newValue);
  };

  return (
    <Page title={`${year}/${month}/${day}`}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link color="inherit" to="/" component={RLink}>
          Dashboard
        </Link>
      </Breadcrumbs>
      <Typography component="h1" variant="h4">
        {dateToString(dayDate)}
      </Typography>
      <ProductivityLevel level={prodLevel} config={config} />
      <Tabs value={currTab} onChange={handleChange} aria-label="Day tabs">
        <Tab label="Full log" {...a11yProps(0)} />
        <Tab label="Top sites by usage" {...a11yProps(1)} />
        <Tab label="Day graph" {...a11yProps(2)} />
      </Tabs>
      <TabPanel value={currTab} index={0}>
        <FullDayLog records={records} />
      </TabPanel>
      <TabPanel value={currTab} index={1}>
        <TopSites records={records} />
      </TabPanel>
      <TabPanel value={currTab} index={2}>
        <DayGraph dayDate={dayDate} records={records} />
      </TabPanel>
    </Page>
  );
};

export default DayPage;
