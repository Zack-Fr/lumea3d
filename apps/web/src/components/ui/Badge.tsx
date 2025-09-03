import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

/**
 * Badge variant options
 */
type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/**
 * Badge component props
 */
interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Whether to render as a child component using Radix Slot */
  asChild?: boolean;
  /** ARIA label for screen readers */
  'aria-label'?: string;
  /** ARIA describedby for screen readers */
  'aria-describedby'?: string;
  /** ARIA role for semantic meaning */
  role?: string;
}

/**
 * Badge variants configuration using class-variance-authority
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/**
 * Badge component - Versatile badge component for labels, status indicators, and tags
 *
 * @param className - Additional CSS classes
 * @param variant - Visual style variant
 * @param asChild - Whether to render as child component
 * @param children - Badge content
 * @param props - Additional span props
 *
 * @example
 * ```tsx
 * <Badge variant="default">New</Badge>
 * <Badge variant="destructive">Error</Badge>
 * <Badge variant="outline" role="status">Active</Badge>
 * <Badge asChild><a href="/tag">Tag Link</a></Badge>
 * ```
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({
    className,
    variant,
    asChild = false,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    role,
    children,
    ...props
  }, ref) {
    const Comp = asChild ? Slot : "span";

    return (
      <Comp
        ref={ref}
        data-slot="badge"
        className={cn(badgeVariants({ variant }), className)}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        role={role}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };

export type { BadgeProps, BadgeVariant };
