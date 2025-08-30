import * as React from "react";
import s from "./Card.module.css";

function Card({ className = "", ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card" className={`${s.card} ${className}`} {...props} />;
}

function CardHeader({ className = "", ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={`${s.cardHeader} ${className}`} {...props} />;
}

function CardTitle({ className = "", ...props }: React.ComponentProps<"h4">) {
  return <h4 data-slot="card-title" className={`${s.cardTitle} ${className}`} {...props} />;
}

function CardDescription({ className = "", ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={className} {...props} />;
}

function CardContent({ className = "", ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={`${s.cardContent} ${className}`} {...props} />;
}

function CardFooter({ className = "", ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={className} {...props} />;
}

function CardAction({ className = "", ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={className} {...props} />;
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
