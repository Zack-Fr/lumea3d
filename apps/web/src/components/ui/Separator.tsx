"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "./utils";

/**
 * Separator orientation options
 */
type SeparatorOrientation = "horizontal" | "vertical";

/**
 * Separator component props
 */
interface SeparatorProps
  extends React.ComponentProps<typeof SeparatorPrimitive.Root> {
  /** Orientation of the separator */
  orientation?: SeparatorOrientation;
  /** Whether the separator is purely decorative */
  decorative?: boolean;
  /** ARIA label for screen readers */
  'aria-label'?: string;
  /** ARIA describedby for screen readers */
  'aria-describedby'?: string;
}

/**
 * Separator component - Visual separator for dividing content sections
 *
 * @param className - Additional CSS classes
 * @param orientation - Orientation of the separator (horizontal or vertical)
 * @param decorative - Whether the separator is purely decorative
 * @param props - Additional separator props
 *
 * @example
 * ```tsx
 * <Separator />
 * <Separator orientation="vertical" />
 * <Separator decorative={false} aria-label="Content divider" />
 * ```
 */
const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) {
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...props}
    />
  );
});

Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };

export type { SeparatorProps, SeparatorOrientation };
