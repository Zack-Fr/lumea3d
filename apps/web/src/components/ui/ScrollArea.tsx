import * as React from "react";

export function ScrollArea({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="scroll-area" style={{ overflow: 'auto' }} className={className} {...props}>
      {children}
    </div>
  );
}

export default ScrollArea;
