import React, { useMemo, useEffect, useState, useContext } from "react";
import Page from "~/components/Page";
import { Link as RLink } from "~/routeManager";
import { allRecordsForDay, useIndexedDbHandle } from "~/db";
import {
  DbHandle,
  Configuration,
  TrackInfoRecord,
  TrackedDay,
  TrackedRecordsGrouped,
  DayRecord,
} from "~/types";
import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
  DEFAULT_CONFIG,
} from "~/constants";
import { Link, Tabs, Tab, Paper, Typography, Breadcrumbs } from "~/theme";
import AppContext from "~/AppContext";
import {
  dateFormatHMS,
  getProdPerc,
  calcProductivityLevelForDay,
  dateToString,
  DefaultMap,
  recordProd,
  toDuration,
  interpRangeZero,
  rgbToCSS,
  RGB,
  colorGradient,
} from "~/util";
import { DataGrid } from "@mui/x-data-grid";
import * as d3 from "d3";
import { select } from "d3-selection";
import { scaleLinear, scaleTime } from "d3-scale";
import { range, histogram, max } from "d3-array";
import { format } from "d3-format";
import { randomBates } from "d3-random";
import { axisBottom } from "d3-axis";

interface DayPageProps {
  year: string;
  month: string;
  day: string;
}

const ProductivityLevel = (props: {
  config: Configuration<any>;
  level: number;
}) => {
  const { config, level } = props;
  const prodP = getProdPerc(config, level);
  const width = 100 - prodP;
  return (
    <div className="prod-level-bar">
      <div
        className="prod-level-bar__part"
        style={{ width: `${width}%` }}
      ></div>
    </div>
  );
};

const topSiteLowColor: RGB = { r: 255, g: 255, b: 255 };
const topSiteHighColor: RGB = { r: 0, g: 255, b: 0 };

const TopSites = (props: { records: TrackInfoRecord[] }) => {
  const { config } = useContext(AppContext);
  const { records } = props;
  type TopSiteRecord = {
    timeSpent: number;
    totalRecords: number;
    totalProd: number;
  };
  const groupedBySite: DefaultMap<string, TopSiteRecord> = useMemo(() => {
    return props.records.reduce((acc, rec, idx) => {
      const nextRow = idx !== records.length - 1 ? records[idx + 1] : null;
      const duration: Date | null = nextRow
        ? (((nextRow.created as any) - (rec.created as any)) as any)
        : (((new Date() as any) - (rec.created as any)) as any);
      const durationD = duration !== null ? new Date(duration) : null;
      const site = new URL(rec.url).host;
      const rr = acc.get(site);
      rr.timeSpent += durationD !== null ? durationD.getTime() : 0;
      rr.totalProd += recordProd(config, rec);
      ++rr.totalRecords;
      return acc;
    }, new DefaultMap<string, TopSiteRecord>(() => ({ timeSpent: 0, totalProd: 0, totalRecords: 0 } as TopSiteRecord)));
  }, [props.records]);
  const groupedBySiteSorted = new Map(
    Array.from(groupedBySite.entries()).sort(([_, a], [__, b]) =>
      a.timeSpent > b.timeSpent ? 1 : a.timeSpent < b.timeSpent ? -1 : 0
    )
  );
  const renderedItems = useMemo(() => {
    return Array.from(groupedBySiteSorted.entries()).map(([siteName, info]) => {
      const maxProd = config.prodUpperBound;
      const intensityP =
        interpRangeZero(maxProd * info.totalRecords, 255, info.totalProd) / 255;
      const background = rgbToCSS(
        colorGradient(topSiteLowColor, topSiteHighColor, intensityP)
      );
      return (
        <div className="top-sites-entry" key={siteName} style={{ background }}>
          <span className="top-sites-entry__name">{siteName}</span>
          <span className="top-sites-entry__value">
            {toDuration(new Date(info.timeSpent))}
          </span>
        </div>
      );
    });
  }, [groupedBySite]);
  return <div className="top-sites">{renderedItems}</div>;
};

const columns = [
  { field: "url", headerName: "Site", width: 300 },
  { field: "created", headerName: "Started", width: 150 },
  { field: "duration", headerName: "Duration", width: 150 },
];

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

const FullDayLog = (props: { records: TrackInfoRecord[] }) => {
  const { records } = props;
  const rows = React.useMemo(
    () =>
      records.map((rec, idx) => {
        const nextRow = idx !== records.length - 1 ? records[idx + 1] : null;
        const duration: Date | null = nextRow
          ? (((nextRow.created as any) - (rec.created as any)) as any)
          : (((new Date() as any) - (rec.created as any)) as any);
        const durationD = new Date(duration);
        const durationS = toDuration(durationD);
        return {
          ...rec,
          created: dateToString(rec.created),
          id: rec.created.getTime(),
          duration: durationS,
        };
      }),
    [records]
  );
  return (
    <div className="day-log">
      <DataGrid rows={rows} columns={columns} checkboxSelection />
    </div>
  );
};

const DayGraph = (props: { records: TrackInfoRecord[] }) => {
  const { config } = useContext(AppContext);
  const { records } = props;
  const container = React.useRef(null);
  const color = "#00ff00";
  const margin = { left: 15, right: 15, top: 15, bottom: 15 };
  const width = 1000;
  const height = 500;

  let data = useMemo(
    () =>
      props.records.map((r) => ({
        x0: r.created,
        x1: new Date(r.created.getTime() + 500),
        length: recordProd(config, r),
      })),
    [props.records]
  );
  let formatCount = format(",.0f");

  useEffect(() => {
    console.log(data);
    if (!container.current) return;
    if (data.length === 0) return;
    let hist = select(container.current);
    let margin = { top: 10, right: 30, bottom: 30, left: 30 };
    let width = +hist.attr("width") - margin.left - margin.right;
    let height = +hist.attr("height") - margin.top - margin.bottom;
    let g = hist
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const from_ = data[0].x0;
    const to = data[data.length - 1].x1;
    console.log(from_, to);
    let x = scaleTime().domain([from_, to]).range([0, width]);

    let generator = histogram<any, any>()
      .domain((d) => x.domain() as any)
      .thresholds(x.ticks(20));

    let bins = generator(data);

    let y = scaleLinear<number>()
      .domain([
        0,
        max(bins, (d) => {
          return d.length;
        }),
      ])
      .range([height, 0]);

    let bar = g
      .selectAll(".bar")
      .data(bins)
      .enter()
      .append("g")
      .attr("class", "bar")
      .attr("transform", (d) => {
        return "translate(" + x(d.x0) + "," + y(d.length) + ")";
      });

    let barWidth = x(bins[0].x1) - x(bins[0].x0) - 1;

    bar
      .append("rect")
      .attr("x", 1)
      .attr("width", barWidth)
      .attr("height", (d) => {
        return height - y(d.length);
      });

    let textLoc = (x(bins[0].x1) - x(bins[0].x0)) / 2;

    bar
      .append("text")
      .attr("dy", ".75em")
      .attr("y", 6)
      .attr("x", textLoc)
      .attr("text-anchor", "middle")
      .text((d) => {
        return formatCount(d.length);
      });

    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(axisBottom(x));
  }, [data]);

  return <svg ref={container} width="960" height="500"></svg>;
};

const DayPage = (props: DayPageProps) => {
  const { year, month, day } = props;
  const { config } = useContext(AppContext);
  const db = useIndexedDbHandle();
  const [records, setRecords] = useState<TrackInfoRecord[]>([]);
  const dayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const prodLevel = calcProductivityLevelForDay(config, records);
  useEffect(() => {
    (async () => {
      if (db === null) return;
      const res = await allRecordsForDay(db, dayDate);
      setRecords(res);
    })();
  }, [db]);

  const [value, setValue] = React.useState<number>(2);

  const handleChange = (event: React.SyntheticEvent<any>, newValue: number) => {
    setValue(newValue);
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
      <Tabs value={value} onChange={handleChange} aria-label="Day tabs">
        <Tab label="Full log" {...a11yProps(0)} />
        <Tab label="Top sites by usage" {...a11yProps(1)} />
        <Tab label="Day graph" {...a11yProps(2)} />
      </Tabs>
      <TabPanel value={value} index={0}>
        <FullDayLog records={records} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <TopSites records={records} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <DayGraph records={records} />
      </TabPanel>
    </Page>
  );
};

export default DayPage;
