import React, { useMemo, useEffect, useState, useContext } from "react";
import Page from "~/components/Page";
import { Link as RLink } from "~/routeManager";
import {
  TrackInfoRecord,
  TrackedDay,
  TrackedRecordsGrouped,
  allRecordsForDay,
} from "~/trackedRecord";
import { DayRecord } from "~/types";
import { Configuration } from "~/configuration";
import {
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
  DEFAULT_CONFIG,
} from "~/constants";
import { Link, Tabs, Tab, Paper, Typography, Breadcrumbs } from "~/theme";
import AppContext from "~/AppContext";
import {
  getProdPerc,
  calcProductivityLevelForDay,
  DefaultMap,
  recordProd,
  interpRangeZero,
  rgbToCSS,
  RGB,
  colorGradient,
} from "~/util";
import {
  dateToString,
  toDuration,
  Duration,
  dateDiff,
  durAdd,
  durationHours,
  dateFormatHMS,
} from "~/dates";
import { DataGrid } from "@mui/x-data-grid";
import * as d3 from "d3";
import { select } from "d3-selection";
import { scaleLinear, scaleTime } from "d3-scale";
import { range, bin, max } from "d3-array";
import { format } from "d3-format";
import { randomBates } from "d3-random";
import { axisBottom } from "d3-axis";
import { axisLeft } from "d3";
import ProductivityLevel from "~/components/ProductivityLevel";
import TopSites from "./TopSites";
import FullDayLog from "./FullDayLog";

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

const DayGraph = (props: { dayDate: Date; records: TrackInfoRecord[] }) => {
  const { config } = useContext(AppContext);
  const { dayDate, records } = props;
  const container = React.useRef(null);
  const color = "#00ff00";
  const margin = { left: 15, right: 15, top: 15, bottom: 15 };
  const renderWidth = 900;
  const renderHeight = 500;

  const stc = {
    workRelated: "#840032",
    porn: "#E59500",
    reading: "#02040F",
    dumbEntertainment: "#E5DADA",
  };
  const recordColor = (record: TrackInfoRecord) => (stc as any)[record.type];

  interface DataItem {
    x0: Date;
    x1: Date;
    length: number;
    rec: TrackInfoRecord;
  }

  let data: DataItem[] = useMemo(
    () =>
      props.records.map((r, idx) => {
        const nextItem =
          idx != props.records.length - 1 ? props.records[idx + 1] : null;
        const nextCreated =
          nextItem !== null
            ? nextItem.created
            : new Date(r.created.getTime() + 1000);
        return {
          x0: r.created,
          x1: nextCreated,
          length: recordProd(config, r),
          rec: r,
        };
      }),
    [props.records]
  );
  let formatCount = format(",.0f");
  const spaceBetween = 1;
  const strokeWidth = 1;

  useEffect(() => {
    if (!container.current) return;
    if (data.length === 0) return;

    const dayStart = dayDate;
    const dayEnd = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);

    let hist = select(container.current);
    hist.selectAll("*").remove();

    let margin = { top: 10, right: 30, bottom: 30, left: 30 };
    let width = renderWidth - margin.left - margin.right;
    let height = renderHeight - margin.top - margin.bottom;
    let g = hist
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    let x = scaleTime().domain([dayStart, dayEnd]).range([0, width]);

    const bins = data;

    const [minHeight, maxHeight] = d3.extent(data, (d) => d.length);
    let y = scaleLinear().domain([minHeight, maxHeight]).range([height, 0]);

    const lineGenerator = d3
      .line<any>()
      .x(function (d) {
        return x(d.x0);
      })
      .y(function (d) {
        return y(d.length);
      })
      .curve(d3.curveBasis);

    const areaGenerator = d3
      .area<DataItem>()
      .x(function (d) {
        return x(d.x0);
      })
      .y0(function (d) {
        return strokeWidth;
      })
      .y1(function (d) {
        return height;
      })
      .curve(d3.curveBasis);

    const div = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // by site grouping
    for (let i = 0; i < bins.length; ++i) {
      const next = i !== bins.length - 1 ? bins[i + 1] : bins[bins.length - 1];
      g.append("path")
        .data([[bins[i], next]])
        .attr("d", areaGenerator)
        .style("fill", (d) => {
          return recordColor(d[0].rec);
        })
        .style("opacity", 0.75);
    }

    const emptyAreaGenerator = d3
      .area<DataItem>()
      .x(function (d) {
        return x(d.x0);
      })
      .y0(function (d) {
        return 0;
      })
      .y1(function (d) {
        return y(d.length);
      })
      .curve(d3.curveBasis);

    g.append("path")
      .attr("id", "empty-area")
      .data([[...bins]])
      .attr("d", emptyAreaGenerator)
      .style("fill", "#fff");

    const emptyAreaOnTheEdgesGenerator = d3
      .area<DataItem>()
      .x(function (d) {
        return x(d.x0);
      })
      .y0(function (d) {
        return 0;
      })
      .y1(function (d) {
        return height;
      });

    const K = 500_000;
    g.append("path")
      .attr("id", "hello-bitches")
      .data([
        [
          { x0: dayStart, length: maxHeight } as any,
          { ...bins[0], x0: new Date(bins[0].x0.getTime() + K) },
        ],
      ])
      .attr("d", emptyAreaOnTheEdgesGenerator)
      .style("fill", "#fff");

    g.append("path")
      .attr("id", "hello-bitches")
      .data([
        [
          {
            x0: new Date((bins[bins.length - 1].x0 as any).getTime() - K),
            length: maxHeight,
          } as any,
          {
            x0: dayEnd,
            length: maxHeight,
          },
        ],
      ])
      .attr("d", emptyAreaOnTheEdgesGenerator)
      .style("fill", "#fff");

    // line
    g.append("path")
      .attr("id", "the-line")
      .attr("d", lineGenerator(bins))
      .attr("stroke", "#3C6E71")
      .attr("stroke-width", strokeWidth)
      .attr("fill", "transparent");

    // x axis
    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0, ${height})`)
      .call(axisBottom(x).ticks(d3.timeHour.every(1)));

    // y axis
    g.append("g")
      .attr("class", "axis axis--y")
      .attr("transform", `translate(0, 0)`)
      .call(axisLeft(y));
  }, [data]);

  return (
    <div className="day-graph">
      <svg ref={container} viewBox={`0 0 ${renderWidth} ${renderHeight}`}></svg>
    </div>
  );
};

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

  const [value, setValue] = React.useState<number>(1);

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
        <DayGraph dayDate={dayDate} records={records} />
      </TabPanel>
    </Page>
  );
};

export default DayPage;
