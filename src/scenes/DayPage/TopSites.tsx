import React, { useContext, useMemo } from "react";
import {
  TrackInfoRecord,
} from "~/trackedRecord";


import AppContext from "~/AppContext";
import {
  DefaultMap,
  recordProd,
  interpRangeZero,
  rgbToCSS,
  RGB,
  colorGradient,
} from "~/util";
import {
  Duration,
  durAdd,
} from "~/dates";
import { formatDistance } from "date-fns";
import { recDurationAtIndex } from "~/trackedRecord";

const topSiteLowColor: RGB = { r: 255, g: 255, b: 255 };
const topSiteHighColor: RGB = { r: 0, g: 255, b: 0 };

const TopSites = (props: { records: TrackInfoRecord[] }) => {
  const { config } = useContext(AppContext);
  const { records } = props;
  type TopSiteRecord = {
    timeSpent: Duration;
    totalRecords: number;
    totalProd: number;
  };
  const groupedBySite: DefaultMap<string, TopSiteRecord> = useMemo(() => {
    return props.records.reduce((acc, rec, idx) => {
      const duration = recDurationAtIndex(props.records, idx);
      const site = new URL(rec.url).host;
      const rr = acc.get(site);
      rr.timeSpent = duration !== null ? durAdd(rr.timeSpent, duration) : 0;
      rr.totalProd += recordProd(config, rec);
      ++rr.totalRecords;
      return acc;
    }, new DefaultMap<string, TopSiteRecord>(() => ({ timeSpent: 0, totalProd: 0, totalRecords: 0 } as TopSiteRecord)));
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
  const renderedItems = useMemo(() => {
    return keysSorted.map((siteName: string) => {
      const info: TopSiteRecord = groupedBySite.get(siteName);
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
            {formatDistance(0, new Date(info.timeSpent).getTime(), {
              includeSeconds: true,
            })}
          </span>
        </div>
      );
    });
  }, [keysSorted, groupedBySite]);
  return <div className="top-sites">{renderedItems}</div>;
};

export default TopSites;
