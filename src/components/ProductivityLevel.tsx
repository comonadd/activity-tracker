import React, { useState } from "react";
import { Configuration } from "~/configuration";
import { getProdPerc } from "~/util";
import { Tooltip, useTheme } from "~/theme";

const ProductivityLevel = (props: {
  config: Configuration<any>;
  level: number;
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
