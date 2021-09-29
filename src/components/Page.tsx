import React from "react";
import cn from "~/cn";

const Page = (props: { title: string; children: any; className?: string }) => {
  const { title, children } = props;
  React.useEffect(() => {
    document.title = title;
  }, [title]);
  return <div className={cn([props.className, "page"])}>{children}</div>;
};

export default Page;
