import * as React from "react";

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: number;
}

export function Slider(props: SliderProps) {
  return <input type="range" {...props} />;
}

export default Slider;
