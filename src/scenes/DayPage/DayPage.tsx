import React, { useMemo, useEffect, useState, useContext } from "react";
import Page from "~/components/Page";
import { TrackInfoRecord, allRecordsForDay } from "~/trackedRecord";
import { Size, Tabs, Tab, Typography } from "~/theme";
import AppContext from "~/AppContext";
import { calcProductivityLevelForDay } from "~/util";
import { dateToString } from "~/dates";
import ProductivityLevel from "~/components/ProductivityLevel";
import TopSites from "./TopSites";
import FullDayLog from "./FullDayLog";
import DayGraph from "./DayGraph";
import BreadcrumbsForPath from "~/components/BreadcrumbsForPath";
import { useLocalStorageState } from "~/hooks";

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
    <div className="tab-container" hidden={props.index !== props.value}>
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

const Breadcrumbs = React.memo(() => {
  return <BreadcrumbsForPath path={[{ text: "Dashboard", path: "/" }]} />;
});

const DayPage = (props: DayPageProps) => {
  const { year, month, day } = props;
  const { config } = useContext(AppContext);
  const [records, setRecords] = useState<TrackInfoRecord[]>([]);
  const dayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const prodLevel = useMemo(
    () => calcProductivityLevelForDay(config, records),
    [config, records]
  );
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    const res = await allRecordsForDay(dayDate);
    setRecords(res);
    setLoading(false);
  };
  useEffect(() => {
    refresh();
  }, []);
  const [currTab, setCurrTab] = useLocalStorageState<number>("day-page-tab", 0);

  const handleChange = (event: React.SyntheticEvent<any>, newValue: number) => {
    setCurrTab(newValue);
  };

  return (
    <Page title={`${year}/${month}/${day}`} className="day-page">
      <Breadcrumbs />
      <div className="mb-2">
        <Typography component="h1" variant="h5">
          {dateToString(dayDate)}
        </Typography>
      </div>
      <ProductivityLevel
        size={Size.Large}
        level={prodLevel}
        config={config}
        className="mb-2 f-sauto"
      />
      <Tabs
        value={currTab}
        onChange={handleChange}
        aria-label="Day tabs"
        textColor="secondary"
        indicatorColor="secondary"
        className="day-tabs"
      >
        <Tab className="day-page-tab" label="Full Log" {...a11yProps(0)} />
        <Tab
          className="day-page-tab"
          label="Top sites by usage"
          {...a11yProps(1)}
        />
        <Tab className="day-page-tab" label="Graph" {...a11yProps(2)} />
      </Tabs>
      {currTab === 0 ? (
        <TabPanel value={currTab} index={0}>
          <FullDayLog loading={loading} records={records} refresh={refresh} />
        </TabPanel>
      ) : currTab === 1 ? (
        <TabPanel value={currTab} index={1}>
          <TopSites records={records} />
        </TabPanel>
      ) : currTab === 2 ? (
        <TabPanel value={currTab} index={2}>
          <DayGraph loading={loading} dayDate={dayDate} records={records} />
        </TabPanel>
      ) : null}
    </Page>
  );
};

export default DayPage;
