"use client";

import { cn } from "@/lib/utils";

interface MobileContentWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default function MobileContentWrapper({
  children,
  className,
}: MobileContentWrapperProps) {
  return (
    <div className={cn("mobile-nav-padding", className)}>
      {children}
    </div>
  );
}