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
  const right = useMemo(() => {
    const items = [];
    const endAt = Math.min(props.current + props.radius + 1, props.count);
    for (let k = props.current + 1; k < endAt; ++k) {
      items.push(<NumButton key={k} n={k} onChange={props.onChange} />);
    }
    return items;
  }, [props.count, props.current]);
  const lastPage = (
    <NumButton key="last" n={props.count} onChange={props.onChange} />
  );
  return (
    <div className="paginator df dfr">
      {left}
      {current}
      {right}
      <span className="df fcv mh-8">...</span>
      {lastPage}
    </div>
  );
};

export default Pagination;
