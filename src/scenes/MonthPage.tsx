import React from "react";
import Page from "~/components/Page";
import { useParams } from "~/routeManager";





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
