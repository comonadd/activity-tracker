import { Typography, Link, Breadcrumbs } from "~/theme";
import { Link as RLink } from "~/routeManager";
import React from "react";

const BreadcrumbsForPath = (props: {
  path: {
    path: string;
    text: string;
    disabled?: boolean;
    external?: boolean;
  }[];
}) => (
  <Breadcrumbs aria-label="breadcrumb" className="fs-14 mb-4">
    {props.path.map((item) =>
      item.disabled ? (
        <Typography key={item.path} className="fs-14" color="inherit">
          {item.text}
        </Typography>
      ) : item.external ? (
        <Link key={item.path} href={item.path}>
          {item.text}
        </Link>
      ) : (
        <Link key={item.path} to={item.path} component={RLink}>
          {item.text}
        </Link>
      )
    )}
  </Breadcrumbs>
);

export default BreadcrumbsForPath;
