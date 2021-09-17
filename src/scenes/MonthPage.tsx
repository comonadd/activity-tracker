import React, { useEffect, useState, useContext } from "react";
import Page from "~/components/Page";
import { useParams } from "~/routeManager";
import { useIndexedDbHandle } from "~/db";
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
import { Typography, Breadcrumbs } from "~/theme";
import AppContext from "~/AppContext";

interface MonthPageProps {}

const MonthPage = (props: MonthPageProps) => {
  const { year, month } = useParams<any>();
  return (
    <Page title={`${year}/${month}`}>
      <h1>
        {year}/{month}
      </h1>
    </Page>
  );
};

export default MonthPage;
