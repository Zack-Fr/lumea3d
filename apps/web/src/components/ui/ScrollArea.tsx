"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "./utils";

/**
 * ScrollArea orientation options
 */
type ScrollAreaOrientation = "vertical" | "horizontal";

/**
 * ScrollArea component props
 */
interface ScrollAreaProps
  extends React.ComponentProps<typeof ScrollAreaPrimitive.Root> {
  /** ARIA label for screen readers */
  'aria-label'?: string;
  /** ARIA describedby for screen readers */
  'aria-describedby'?: string;
}

/**
 * ScrollBar component props
 */
interface ScrollBarProps
  extends React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> {
  /** Orientation of the scrollbar */
  orientation?: ScrollAreaOrientation;
}

/**
 * ScrollArea component - Custom scrollable area with styled scrollbars
 *
 * @param className - Additional CSS classes
 * @param children - Content to be made scrollable
 * @param props - Additional scroll area props
 *
 * @example
 * ```tsx
 * <ScrollArea className="h-64 w-full">
 *   <div>Scrollable content</div>
 * </ScrollArea>
 * ```
 */
const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(function ScrollArea({
  className,
  children,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) {
  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      data-slot="scroll-area"
      className={cn("relative", className)}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});

ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

/**
 * ScrollBar component - Styled scrollbar for ScrollArea
 *
 * @param className - Additional CSS classes
 * @param orientation - Orientation of the scrollbar
 * @param props - Additional scrollbar props
 *
 * @example
 * ```tsx
 * <ScrollBar orientation="horizontal" />
 * ```
 */
const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  ScrollBarProps
>(function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}, ref) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      ref={ref}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
});

ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };

export type { ScrollAreaProps, ScrollBarProps, ScrollAreaOrientation };
