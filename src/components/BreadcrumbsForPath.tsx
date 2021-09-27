import { Link, Breadcrumbs } from "~/theme";
import { Link as RLink } from "~/routeManager";
import React from "react";

const BreadcrumbsForPath = (props: {
  path: { path: string; text: string }[];
}) => (
  <Breadcrumbs aria-label="breadcrumb">
    {props.path.map((item) => (
      <Link key={item.path} to={item.path} component={RLink}>
        {item.text}
      </Link>
    ))}
  </Breadcrumbs>
);

export default BreadcrumbsForPath;
