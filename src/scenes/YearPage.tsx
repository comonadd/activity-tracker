import React from "react";
import { useParams, Link } from "~/routeManager";
import { Breadcrumbs } from "~/theme";
import Page from "~/components/Page";

interface YearPageProps {}

const YearPage = (props: YearPageProps) => {
  const { year } = useParams<any>();
  return (
    <Page title={`Year ${year}`}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link color="inherit" to="/">
          Dashboard
        </Link>
      </Breadcrumbs>
      <h1>{year}</h1>
    </Page>
  );
};

export default YearPage;
