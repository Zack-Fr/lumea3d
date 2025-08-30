import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import s from "./Button.module.css";

type Variant = "default" | "outline" | "ghost" | "secondary";
type Size = "sm" | "md" | "lg" | string;

interface ButtonProps extends React.ComponentProps<"button"> {
  asChild?: boolean;
  className?: string;
  variant?: Variant;
  size?: Size;
}

export function Button({
  className = "",
  asChild = false,
  variant = "default",
  size = "md",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  const variantClass =
    variant === "outline"
      ? s.outline
      : variant === "ghost"
      ? s.ghost
      : variant === "secondary"
      ? s.secondary || s.default
      : s.default;

  const sizeClass = size === "sm" ? s.sizeSm : size === "lg" ? s.sizeLg : "";

  return (
    <Comp
      data-slot="button"
      className={`${s.button} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    />
  );
}
