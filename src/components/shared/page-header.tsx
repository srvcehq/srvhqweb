"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground truncate">
          {title}
        </h1>
        {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
          {actions}
        </div>
      )}
    </div>
  );
}
