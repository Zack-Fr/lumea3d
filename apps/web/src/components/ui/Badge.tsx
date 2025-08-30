import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import s from "./Badge.module.css";

interface BadgeProps extends React.ComponentProps<"span"> {
  asChild?: boolean;
  className?: string;
}

export function Badge({ className = "", asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={`${s.badge} ${className}`}
      {...props}
    />
  );
}
