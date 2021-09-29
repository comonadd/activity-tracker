import React, { useContext, useMemo, useState } from "react";
import { TrackInfoRecord } from "~/trackedRecord";

import AppContext from "~/AppContext";
import {
  DefaultMap,
  recordProd,
  interpRangeZero,
  rgbToCSS,
  RGB,
  colorGradient,
} from "~/util";
import { Duration, durAdd } from "~/dates";
import { formatDistance } from "date-fns";
import { recDurationAtIndex } from "~/trackedRecord";
import { useAppConfigPart, ActivityType } from "~/configuration";
import { Tooltip, DEFAULT_ACTIVITY_COLOR } from "~/theme";

const topSiteLowColor: RGB = { r: 255, g: 255, b: 255 };
const topSiteHighColor: RGB = { r: 0, g: 255, b: 0 };

const TopSites = (props: { records: TrackInfoRecord[] }) => {
  const { config } = useContext(AppContext);

  type TopSiteRecord = {
    timeSpent: Duration;
    totalRecords: number;
    totalProd: number;
    type: ActivityType;
  };

  const [groupedBySite, totalTime, totalProd] = useMemo(() => {
    let totalTime = 0;
    let totalProd = 0;
    const grouped: DefaultMap<string, TopSiteRecord> = props.records.reduce(
      (acc, rec, idx) => {
        const duration = recDurationAtIndex(props.records, idx);
        const site = new URL(rec.url).host;
        const rr = acc.get(site);
        rr.timeSpent = duration !== null ? durAdd(rr.timeSpent, duration) : 0;
        const lprod = recordProd(config, rec);
        rr.totalProd += lprod;
        rr.type = rec.type;
        totalTime += duration;
        totalProd += lprod;
        ++rr.totalRecords;
        return acc;
      },
      new DefaultMap<string, TopSiteRecord>(
        () => ({ timeSpent: 0, totalProd: 0, totalRecords: 0 } as TopSiteRecord)
      )
    );
    return [grouped, totalTime, totalProd];
  }, [props.records]);

  const keysSorted = useMemo(
    () =>
      Array.from(groupedBySite.keys()).sort((aKey, bKey) => {
        const a = groupedBySite.get(aKey).timeSpent;
        const b = groupedBySite.get(bKey).timeSpent;
        return a > b ? -1 : a < b ? 1 : 0;
      }),
    [groupedBySite]
  );

  const activityColors = useAppConfigPart("activityColors");

  const [ts, setTooltipState] = useState<Record<string, boolean>>({});
  const handleClose = (site: string) =>
    setTooltipState({ ...ts, [site]: false });
  const handleOpen = (site: string) => setTooltipState({ ...ts, [site]: true });

  const renderedItems = useMemo(() => {
    return keysSorted.map((siteName: string, idx: number) => {
      const info: TopSiteRecord = groupedBySite.get(siteName);
      const maxProd = config.prodUpperBound;
      const intensityP =
        interpRangeZero(maxProd * info.totalRecords, 255, info.totalProd) / 255;
      const background = rgbToCSS(
        colorGradient(topSiteLowColor, topSiteHighColor, intensityP)
      );
      const percSpent = Math.round((info.timeSpent / totalTime) * 100);
      const percProd = Math.round((info.totalProd / totalProd) * 100);
      return (
        <div className="top-sites-entry" key={siteName}>
          <div className="df">
            <Tooltip
              title={info.type}
              open={ts[siteName] ?? false}
              onClose={() => handleClose(siteName)}
              onOpen={() => handleOpen(siteName)}
            >
              <div
                className="top-sites-entry__cat mr-8"
                style={{
                  background:
                    activityColors[info.type] ?? DEFAULT_ACTIVITY_COLOR,
                }}
              />
            </Tooltip>
            <span className="top-sites-entry__name">{siteName}</span>
          </div>
          <div className="">
            <div className="top-sites-entry__value mr-2 mb-2">
              {`${formatDistance(0, new Date(info.timeSpent).getTime(), {
                includeSeconds: true,
              })}`}
            </div>
            <div className="df fs-12 fdc">
              <div className="df frr mb-1">{`${percSpent}% of total time`}</div>
              <div className="df frr">{`${percProd}% of total value`}</div>
            </div>
          </div>
        </div>
      );
    });
  }, [keysSorted, groupedBySite, ts]);
  return <div className="top-sites">{renderedItems}</div>;
};

export default TopSites;
