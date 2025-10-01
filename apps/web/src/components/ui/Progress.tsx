import * as React from "react";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0-100
  className?: string;
}

export function Progress({ value = 0, className = "", ...props }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div data-slot="progress" className={`progress ${className}`} {...props}>
      <div style={{ width: `${pct}%`, height: 8, background: 'linear-gradient(90deg,#f6c244,#f39c12)', borderRadius: 4 }} />
    </div>
  );
}

export default Progress;
