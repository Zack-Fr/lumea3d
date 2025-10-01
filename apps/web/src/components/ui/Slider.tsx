import * as React from "react";

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: number;
}

export function Slider({ className, ...props }: SliderProps) {
  return (
    <div className={className}>
      <input type="range" {...props} />
    </div>
  );
}

export default Slider;
