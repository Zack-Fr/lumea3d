import * as React from "react";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function Separator({ orientation = "vertical", className = "", ...props }: SeparatorProps) {
  const style = orientation === "vertical" ? { width: 1, background: 'rgba(0,0,0,0.08)', height: '1.5rem' } : { height: 1, background: 'rgba(0,0,0,0.08)', width: '100%' };
  return <div data-slot="separator" className={className} style={style} {...props} />;
}

export default Separator;
