import React from "react";
import { Configuration } from "~/configuration";
import { getProdPerc } from "~/util";

const prodBarLowColor = "#e0ff4f";
const prodBarHighColor = "#00272b";

const ProductivityLevel = (props: {
  config: Configuration<any>;
  level: number;
}) => {
  const { config, level } = props;
  const prodP = getProdPerc(config, level);
  const width = 100 - prodP;
  return (
    <div
      className="prod-level-bar"
      style={{
        background: `linear-gradient(75deg, ${prodBarLowColor}, ${prodBarHighColor}`,
      }}
    >
      <div
        className="prod-level-bar__part"
        style={{
          width: `${width}%`,
        }}
      ></div>
    </div>
  );
};

export default ProductivityLevel;
