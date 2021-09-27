import React, { useEffect, useMemo, useContext } from "react";
import { AppContext } from "~/AppContext";
import { TrackInfoRecord } from "~/trackedRecord";
import * as d3 from "d3";
import { select } from "d3-selection";
import { scaleLinear, scaleTime } from "d3-scale";
import { axisBottom } from "d3-axis";
import { axisLeft } from "d3";
import { recordProd } from "~/util";
import { addDurationToDate } from "~/dates";
import { TIME_PRECISION_POINT } from "~/constants";

const renderWidth = 900;
const renderHeight = 500;
const margin = { top: 10, right: 30, bottom: 30, left: 30 };

const DayGraph = (props: { dayDate: Date; records: TrackInfoRecord[] }) => {
  const { config } = useContext(AppContext);
  const { dayDate } = props;
  const container = React.useRef(null);
  // TODO: Move to configuration
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

  const data: DataItem[] = useMemo(() => {
    if (props.records.length === 0) return [];
    const actualData = props.records.map((r, idx) => {
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
    });
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
  const strokeWidth = 1;

  useEffect(() => {
    if (!container.current) return;
    if (data.length === 0) return;

    const dayStart = dayDate;
    const dayEnd = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);

    const hist = select(container.current);
    hist.selectAll("*").remove();

    const width = renderWidth - margin.left - margin.right;
    const height = renderHeight - margin.top - margin.bottom;
    const g = hist
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    const x = scaleTime().domain([dayStart, dayEnd]).range([0, width]);

    const minHeight = d3.min(data, (d) => d.length);
    const maxHeight = d3.max(data, (d) => d.length) + 20;
    const y = scaleLinear().domain([minHeight, maxHeight]).range([height, 0]);

    const areaGenerator = d3
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
      .curve(d3.curveBasis);

    // by site grouping
    for (let i = 0; i < data.length; ++i) {
      const next = i !== data.length - 1 ? data[i + 1] : data[data.length - 1];
      g.append("path")
        .data([[data[i], next]])
        .attr("d", areaGenerator)
        .style("fill", (d) => {
          return recordColor(d[0].rec);
        })
        .style("opacity", 0.75);
    }

    // empty area over the line
    const emptyAreaGenerator = d3
      .area<DataItem>()
      .x0(function (d) {
        return x(d.x0);
      })
      .y1(function (d) {
        return y(d.length);
      })
      .curve(d3.curveBasis);
    g.append("path")
      .attr("id", "empty-area")
      .data([
        [
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
        ],
      ])
      .attr("d", emptyAreaGenerator)
      .style("fill", "#fff");

    // line
    const lineGenerator = d3
      .line<any>()
      .x(function (d) {
        return x(d.x0);
      })
      .y(function (d) {
        return y(d.length);
      })
      .curve(d3.curveBasis);
    g.append("path")
      .attr("id", "the-line")
      .attr("d", lineGenerator(data))
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

export default DayGraph;
