import React, { useState, useRef, useEffect, useMemo, useContext } from "react";
import { AppContext } from "~/AppContext";
import { TrackInfoRecord } from "~/trackedRecord";
import * as d3 from "d3";
import { scaleLinear, scaleTime } from "d3-scale";
import { AxisDomain, AxisScale, axisBottom } from "d3-axis";
import { axisLeft } from "d3";
import { recordProd } from "~/util";
import { useLocalStorageState } from "~/hooks";
import { dateFormatHMS, addDurationToDate } from "~/dates";
import { TIME_PRECISION_POINT } from "~/constants";
import {
  useTheme,
  Typography,
  Checkbox,
  Tooltip,
  DEFAULT_ACTIVITY_COLOR,
  CircularProgress,
} from "~/theme";
import { useAppConfigPart } from "~/configuration";

const renderWidth = 900;
const renderHeight = 500;
const margin = { top: 10, right: 10, bottom: 30, left: 10 };
const strokeWidth = 1;

const Axes = (props: {
  x: AxisScale<AxisDomain>;
  y: AxisScale<AxisDomain>;
  height: number;
  width: number;
  labelWidth: number;
}) => {
  const { labelWidth, x, y, height, width } = props;
  const axisBottomRef = useRef(null);
  const axisLeftRef = useRef(null);
  useEffect(() => {
    d3.select(axisBottomRef.current).call(
      axisBottom(x).ticks(d3.timeHour.every(1))
    );
    d3.select(axisLeftRef.current).call(axisLeft(y));
  }, []);
  return (
    <>
      <text
        transform={`translate(${margin.left}, ${height / 2}),rotate(-90)`}
        style={{ textAnchor: "middle" }}
      >
        Productivity
      </text>
      <g
        className="axis axis--y"
        transform={`translate(${margin.left + labelWidth}, ${margin.top})`}
        ref={axisLeftRef}
      />
      <g
        className="axis axis--x"
        transform={`translate(${margin.left + labelWidth}, ${
          margin.top + height
        })`}
        ref={axisBottomRef}
      />
    </>
  );
};

interface DataItem {
  x0: Date;
  x1: Date;
  length: number;
  rec: TrackInfoRecord;
}

type Data = DataItem[];

const ProdLine = (props: {
  data: Data;
  x: AxisScale<AxisDomain>;
  y: AxisScale<AxisDomain>;
}) => {
  const { data, x, y } = props;
  const { prodGraphFillColor } = useTheme();
  const rendered = useMemo(() => {
    const lineGenerator = d3
      .line<any>()
      .x(function (d) {
        return x(d.x0);
      })
      .y(function (d) {
        return y(d.length);
      })
      .curve(d3.curveBasis);
    return (
      <path
        d={lineGenerator(data)}
        stroke={prodGraphFillColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
    );
  }, [data]);
  return rendered;
};

const SiteGroupCols = (props: {
  x: AxisScale<AxisDomain>;
  y: AxisScale<AxisDomain>;
  data: Data;
  height: number;
}) => {
  const { x, y, data, height } = props;
  const areaGenerator = useMemo(
    () =>
      d3
        .area<DataItem>()
        .x(function (d) {
          return x(d.x0);
        })
        .y0(function () {
          return strokeWidth;
        })
        .y1(function () {
          return height;
        })
        .curve(d3.curveBasis),
    []
  );

  const emptyAreaGenerator = useMemo(
    () =>
      d3
        .area<DataItem>()
        .x0(function (d) {
          return x(d.x0);
        })
        .y0(function () {
          return 0; // from the top
        })
        .y1(function (d) {
          return y(d.length); // to the start of the line
        })
        .curve(d3.curveBasis),
    []
  );

  const cols = useRef(null);
  const [ts, setTooltipState] = useState({
    shown: false,
    x: 0,
    y: 0,
    text: "",
  });
  const handleClose = () => setTooltipState({ ...ts, shown: false });
  const handleOpen = () => setTooltipState({ ...ts, shown: true });
  const activityColors = useAppConfigPart("activityColors");
  const recordColor = (record: TrackInfoRecord) =>
    activityColors[record.type] ?? DEFAULT_ACTIVITY_COLOR;

  const renderedSections = useMemo(() => {
    const filledInSections = data.map((datum, i) => {
      const next = i !== data.length - 1 ? data[i + 1] : data[data.length - 1];
      const xpos = x(datum.x0);
      const ypos = y(datum.length);
      return (
        <path
          key={i}
          x={xpos}
          y={ypos}
          fill={recordColor(datum.rec)}
          d={areaGenerator([data[i], next])}
          onMouseOver={() => {
            setTooltipState({
              shown: true,
              x: xpos,
              y: height,
              text: new URL(datum.rec.url).host,
            });
          }}
          onMouseOut={() => {
            setTooltipState({ ...ts, shown: false });
          }}
        />
      );
    });
    return filledInSections;
  }, [data, areaGenerator, ts]);

  const renderedEmptyArea = useMemo(() => {
    return (
      <path
        d={emptyAreaGenerator([
          {
            x0: addDurationToDate(data[0].x0, -TIME_PRECISION_POINT),
            x1: data[0].x0,
            length: 0,
            rec: data[0].rec,
          } as DataItem,
          ...data,
          {
            x0: data[data.length - 1].x1,
            x1: addDurationToDate(
              data[data.length - 1].x1,
              TIME_PRECISION_POINT
            ),
            length: 0,
            rec: data[data.length - 1].rec,
          } as DataItem,
        ])}
        fill="#fff"
      />
    );
  }, [data, emptyAreaGenerator]);

  const renderedTooltip = useMemo(() => {
    return (
      <Tooltip
        title={ts.text}
        open={ts.shown}
        onClose={handleClose}
        onOpen={handleOpen}
      >
        <rect x={ts.x} y={ts.y}>
          {ts.text}
        </rect>
      </Tooltip>
    );
  }, [ts]);

  return (
    <g ref={cols}>
      {renderedSections}
      {renderedEmptyArea}
      {renderedTooltip}
    </g>
  );
};

const DayGraph = (props: {
  loading: boolean;
  dayDate: Date;
  records: TrackInfoRecord[];
}) => {
  const { config } = useContext(AppContext);
  const { dayDate } = props;
  const container = React.useRef(null);

  const data: DataItem[] = useMemo(() => {
    if (props.records.length === 0) return [];
    const actualData = props.records
      .map((r, idx) => {
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
      })
      .filter((a) => a.length !== 0);
    if (actualData.length === 0) return [];
    const firstItem = actualData[0];
    const lastItem = actualData[actualData.length - 1];
    return [
      {
        x0: addDurationToDate(firstItem.x0, -TIME_PRECISION_POINT),
        x1: firstItem.x0,
        length: 0,
        rec: firstItem.rec,
      } as DataItem,
      ...actualData,
      {
        x0: lastItem.x1,
        x1: addDurationToDate(lastItem.x1, TIME_PRECISION_POINT),
        length: 0,
        rec: lastItem.rec,
      } as DataItem,
    ];
  }, [props.records]);

  const dayStart = dayDate;
  const dayEnd = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);
  const width = renderWidth - margin.left - margin.right;
  const height = renderHeight - margin.top - margin.bottom;
  const minHeight = config.prodLowerBound;
  const mH = d3.max(data, (d) => d.length);
  const maxHeight = Math.max(5, mH + mH * 0.2);
  const x = scaleTime().domain([dayStart, dayEnd]).range([0, width]);
  const y = scaleLinear().domain([minHeight, maxHeight]).range([height, 0]);

  const [showGroups, setShowGroups] = useLocalStorageState(
    "show-graph-groups",
    false
  );

  const labelWidth = 20;
  const dataLeftMargin = margin.left + labelWidth;

  return (
    <div className="day-graph">
      <div className="df fsb w-100">
        <Typography component="h1" variant="h5">
          Graph
        </Typography>
        <div className="df fcv">
          <Typography variant="subtitle2">Show groups</Typography>
          <Checkbox
            checked={showGroups}
            onChange={(e) => setShowGroups(e.target.checked)}
          />
        </div>
      </div>
      <svg
        ref={container}
        viewBox={`0 0 ${renderWidth + dataLeftMargin} ${renderHeight}`}
      >
        <Axes
          x={x}
          y={y}
          height={height}
          width={width}
          labelWidth={labelWidth}
        />
        <g transform={`translate(${dataLeftMargin}, ${margin.top})`}>
          {props.loading ? (
            <CircularProgress />
          ) : data.length === 0 ? (
            <text
              style={{ textAnchor: "middle" }}
              transform={`translate(${margin.left + width / 2}, ${height / 2})`}
              className="fs-12"
            >{`No data available (do you have matchers configured?)`}</text>
          ) : (
            <>
              {showGroups && (
                <SiteGroupCols x={x} y={y} data={data} height={height} />
              )}
              <ProdLine x={x} y={y} data={data} />
            </>
          )}
        </g>
      </svg>
    </div>
  );
};

export default DayGraph;
