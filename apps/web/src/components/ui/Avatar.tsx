import React from "react";
import s from "./Avatar.module.css";

export function Avatar({ className = "", ...props }: React.ComponentProps<"div">) {
  return <div className={`${s.avatar} ${className}`} {...props} />;
}

export function AvatarImage({ className = "", ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={`${s.image} ${className}`} {...props} />;
}

export function AvatarFallback({ className = "", ...props }: React.ComponentProps<"span">) {
  return <span className={`${s.fallback} ${className}`} {...props} />;
}
