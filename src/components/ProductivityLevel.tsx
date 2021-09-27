import React from "react";
import { Configuration } from "~/configuration";
import { getProdPerc } from "~/util";
import { useTheme } from "~/theme";

const ProductivityLevel = (props: {
  config: Configuration<any>;
  level: number;
  className?: string;
}) => {
  const { config, level } = props;
  const prodP = getProdPerc(config, level);
  const width = 100 - prodP;
  const { prodBarLowColor, prodBarHighColor } = useTheme();
  return (
    <div
      className={`${props.className} prod-level-bar`}
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
