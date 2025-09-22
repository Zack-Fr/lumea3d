import * as React from "react";
import { cn } from "./utils";

/**
 * Base props interface for all card components
 */
interface BaseCardProps {
  /** Additional CSS classes to apply */
  className?: string;
  /** Children elements */
  children?: React.ReactNode;
}

/**
 * Card component props
 */
interface CardProps extends BaseCardProps, React.HTMLAttributes<HTMLDivElement> {
  /** Card variant for different visual styles */
  variant?: 'default' | 'elevated' | 'outlined';
  /** Whether the card is interactive */
  interactive?: boolean;
  /** ARIA role for accessibility */
  role?: string;
  /** ARIA label for screen readers */
  'aria-label'?: string;
  /** ARIA labelledby for screen readers */
  'aria-labelledby'?: string;
}

/**
 * CardHeader component props
 */
interface CardHeaderProps extends BaseCardProps, React.HTMLAttributes<HTMLDivElement> {
  /** ARIA label for screen readers */
  'aria-label'?: string;
}

/**
 * CardTitle component props
 */
interface CardTitleProps extends BaseCardProps, React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level for semantic HTML */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** ARIA label for screen readers */
  'aria-label'?: string;
}

/**
 * CardDescription component props
 */
interface CardDescriptionProps extends BaseCardProps, React.HTMLAttributes<HTMLParagraphElement> {
  /** ARIA describedby for screen readers */
  'aria-describedby'?: string;
}

/**
 * CardAction component props
 */
interface CardActionProps extends BaseCardProps, React.HTMLAttributes<HTMLDivElement> {
  /** ARIA label for screen readers */
  'aria-label'?: string;
}

/**
 * CardContent component props
 */
interface CardContentProps extends BaseCardProps, React.HTMLAttributes<HTMLDivElement> {
  /** ARIA label for screen readers */
  'aria-label'?: string;
}

/**
 * CardFooter component props
 */
interface CardFooterProps extends BaseCardProps, React.HTMLAttributes<HTMLDivElement> {
  /** ARIA label for screen readers */
  'aria-label'?: string;
}

/**
 * Card component - Main container for card content
 *
 * @param className - Additional CSS classes
 * @param variant - Visual variant of the card
 * @param interactive - Whether the card is interactive
 * @param children - Card content
 * @param props - Additional HTML div props
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  function Card({
    className,
    variant = 'default',
    interactive = false,
    role,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    children,
    ...props
  }, ref) {
    const baseClasses = "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border";
    const variantClasses = {
      default: '',
      elevated: 'shadow-lg',
      outlined: 'border-2'
    };
    const interactiveClasses = interactive ? 'hover:shadow-md transition-shadow cursor-pointer' : '';

    const cardProps: React.HTMLAttributes<HTMLDivElement> = {
      ...props,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
    };

    if (interactive) {
      cardProps.role = "button";
      cardProps.tabIndex = 0;
    } else if (role) {
      cardProps.role = role;
    }

    return (
      <div
        ref={ref}
        data-slot="card"
        className={cn(
          baseClasses,
          variantClasses[variant],
          interactiveClasses,
          className,
        )}
        {...cardProps}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

/**
 * CardHeader component - Header section of the card
 *
 * @param className - Additional CSS classes
 * @param children - Header content
 * @param props - Additional HTML div props
 */
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader({
    className,
    'aria-label': ariaLabel,
    children,
    ...props
  }, ref) {
    return (
      <div
        ref={ref}
        data-slot="card-header"
        aria-label={ariaLabel}
        className={cn(
          "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

/**
 * CardTitle component - Title section of the card
 *
 * @param className - Additional CSS classes
 * @param level - Semantic heading level (1-6)
 * @param children - Title content
 * @param props - Additional HTML heading props
 */
const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  function CardTitle({
    className,
    level = 4,
    'aria-label': ariaLabel,
    children,
    ...props
  }, ref) {
    const HeadingTag = `h${level}` as React.ElementType;

    return (
      <HeadingTag
        ref={ref}
        data-slot="card-title"
        aria-label={ariaLabel}
        className={cn("leading-none", className)}
        {...props}
      >
        {children}
      </HeadingTag>
    );
  }
);

CardTitle.displayName = "CardTitle";

/**
 * CardDescription component - Description section of the card
 *
 * @param className - Additional CSS classes
 * @param children - Description content
 * @param props - Additional HTML paragraph props
 */
const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  function CardDescription({
    className,
    'aria-describedby': ariaDescribedBy,
    children,
    ...props
  }, ref) {
    return (
      <p
        ref={ref}
        data-slot="card-description"
        aria-describedby={ariaDescribedBy}
        className={cn("text-muted-foreground", className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = "CardDescription";

/**
 * CardAction component - Action section of the card (typically buttons)
 *
 * @param className - Additional CSS classes
 * @param children - Action content
 * @param props - Additional HTML div props
 */
const CardAction = React.forwardRef<HTMLDivElement, CardActionProps>(
  function CardAction({
    className,
    'aria-label': ariaLabel,
    children,
    ...props
  }, ref) {
    return (
      <div
        ref={ref}
        data-slot="card-action"
        aria-label={ariaLabel}
        className={cn(
          "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardAction.displayName = "CardAction";

/**
 * CardContent component - Main content section of the card
 *
 * @param className - Additional CSS classes
 * @param children - Content
 * @param props - Additional HTML div props
 */
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  function CardContent({
    className,
    'aria-label': ariaLabel,
    children,
    ...props
  }, ref) {
    return (
      <div
        ref={ref}
        data-slot="card-content"
        aria-label={ariaLabel}
        className={cn("px-6 [&:last-child]:pb-6", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = "CardContent";

/**
 * CardFooter component - Footer section of the card
 *
 * @param className - Additional CSS classes
 * @param children - Footer content
 * @param props - Additional HTML div props
 */
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter({
    className,
    'aria-label': ariaLabel,
    children,
    ...props
  }, ref) {
    return (
      <div
        ref={ref}
        data-slot="card-footer"
        aria-label={ariaLabel}
        className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardActionProps,
  CardContentProps,
  CardFooterProps,
};
