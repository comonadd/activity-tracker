import React, { useMemo } from "react";
import { Button } from "~/theme";

interface PaginationProps {
  count: number;
  current: number;
  onChange: (n: number) => void;
  radius: number;
}

const NumButton = (props: {
  n: number;
  onChange: (n: number) => void;
  selected?: boolean;
}) => {
  return (
    <Button
      key={props.n}
      onClick={() => props.onChange(props.n)}
      variant={props.selected ? "outlined" : undefined}
      style={{ marginRight: 4 }}
    >
      {props.n}
    </Button>
  );
};

const Pagination = (props: PaginationProps) => {
  const left = useMemo(() => {
    const items = [];
    const startFrom = Math.max(props.current - props.radius, 0);
    for (let k = startFrom; k < props.current; ++k) {
      items.push(<NumButton key={k} n={k} onChange={props.onChange} />);
    }
    return items;
  }, [props.count, props.current]);
  const current = (
    <NumButton
      key="current"
      n={props.current}
      onChange={props.onChange}
      selected
    />
  );
  const showLast = props.current < props.count - props.radius;
  const right = useMemo(() => {
    const items = [];
    const endAt = Math.min(props.current + props.radius + 1, props.count);
    for (let k = props.current + 1; k <= endAt; ++k) {
      // Don't show the last page twice
      if (showLast && k === props.count) {
        continue;
      }
      items.push(<NumButton key={k} n={k} onChange={props.onChange} />);
    }
    return items;
  }, [props.count, props.current]);
  return (
    <div className="paginator df dfr">
      {props.current > props.radius && (
        <>
          <NumButton key="first" n={0} onChange={props.onChange} />
          <span className="df fcv mh-8">...</span>
        </>
      )}
      {left}
      {current}
      {right}
      {showLast && (
        <>
          <span className="df fcv mh-8">...</span>
          <NumButton key="last" n={props.count} onChange={props.onChange} />
        </>
      )}
    </div>
  );
};

export default Pagination;
