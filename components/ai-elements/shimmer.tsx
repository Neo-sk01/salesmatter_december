"use client";

import { cn } from "@/lib/utils";
import { memo } from "react";

export interface TextShimmerProps {
  children: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  duration?: number;
}

const ShimmerComponent = ({
  children,
  as: Tag = "p",
  className,
  duration = 1.8,
}: TextShimmerProps) => {
  const Component = Tag as React.ElementType;

  return (
    <Component
      className={cn(
        "shimmer-text",
        className
      )}
      style={{ "--shimmer-duration": `${duration}s` } as React.CSSProperties}
    >
      {children}
    </Component>
  );
};

export const Shimmer = memo(ShimmerComponent);
