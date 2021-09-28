import React from "react";

const Sentry = (props: { whenInView: () => void }) => {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    if (!ref.current) {
      console.error("Couldn't get ref");
      return;
    }
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.5,
    } as any;
    const observer = new IntersectionObserver((a) => {
      const e: any = a[0];
      if (e.isIntersecting) {
        props.whenInView();
      }
    }, options);
    observer.observe(ref.current!);
    return () => {
      observer.unobserve(ref.current!);
    };
  }, [props.whenInView]);
  return <div style={{ height: 10 }} className="SENTRY" ref={ref}></div>;
};

export default Sentry;
