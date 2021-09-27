import React, { useEffect, useMemo, useContext } from "react";
import { AppContext } from "~/AppContext";
import { TrackInfoRecord } from "~/trackedRecord";
import * as d3 from "d3";
import { select } from "d3-selection";
import { scaleLinear, scaleTime } from "d3-scale";
import { axisBottom } from "d3-axis";
import { axisLeft } from "d3";
import { recordProd } from "~/util";

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

  const data: DataItem[] = useMemo(
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

    const bins = data;

    const [minHeight, maxHeight] = d3.extent(data, (d) => d.length);
    const y = scaleLinear().domain([minHeight, maxHeight]).range([height, 0]);

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
      .y0(function () {
        return strokeWidth;
      })
      .y1(function () {
        return height;
      })
      .curve(d3.curveBasis);

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
      .y0(function () {
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
      .y0(function () {
        return 0;
      })
      .y1(function () {
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

export default DayGraph;
