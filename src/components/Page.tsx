import React from "react";

const Page = (props: { title: string; children: any }) => {
  const { title, children } = props;
  React.useEffect(() => {
    document.title = title;
  }, [title]);
  return <div className="page">{children}</div>;
};

export default Page;
