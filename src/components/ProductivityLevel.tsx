import React, { useState } from "react";
import { Configuration } from "~/configuration";
import { getProdPerc } from "~/util";
import { Size, Tooltip, useTheme } from "~/theme";

const sizeToWidth = {
  [Size.Small]: 8,
  [Size.Medium]: 16,
  [Size.Large]: 24,
};

const ProductivityLevel = (props: {
  config: Configuration<any>;
  level: number;
  size: Size;
  className?: string;
}) => {
  const { config, level } = props;
  const prodP = getProdPerc(config, level);
  const width = 100 - prodP;
  const { prodBarLowColor, prodBarHighColor } = useTheme();
  const [ts, setTooltipState] = useState({
    shown: false,
  });
  const handleClose = () => setTooltipState({ shown: false });
  const handleOpen = () => setTooltipState({ shown: true });
  const thickness = sizeToWidth[props.size];
  return (
    <Tooltip
      placement="bottom-start"
      title={`Productivity is ${prodP}%`}
      open={ts.shown}
      onClose={handleClose}
      onOpen={handleOpen}
    >
      <div
        className={`${props.className} prod-level-bar`}
        style={{
          background: `linear-gradient(75deg, ${prodBarLowColor}, ${prodBarHighColor}`,
          height: thickness,
          flex: `0 0 ${thickness}`,
        }}
        onMouseOver={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
        onMouseOut={(e) => {
          e.stopPropagation();
          handleClose();
        }}
      >
        <div
          className="prod-level-bar__part"
          style={{
            width: `${width}%`,
          }}
          onMouseOver={(e) => {
            e.stopPropagation();
          }}
          onMouseOut={(e) => {
            e.stopPropagation();
          }}
        ></div>
      </div>
    </Tooltip>
  );
};

export default ProductivityLevel;
