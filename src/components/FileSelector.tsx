import React from "react";

const FileSelector = React.forwardRef(
  (props: { onSelected: (data: any) => void }, ref: React.Ref<any>) => {
    return (
      <input
        ref={ref}
        type="file"
        style={{ display: "none" }}
        onClick={(e: any) => props.onSelected(e.target.files)}
      />
    );
  }
);

export default FileSelector;
