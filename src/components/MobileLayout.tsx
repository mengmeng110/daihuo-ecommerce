"use client";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 mobile-nav-padding">
        {children}
      </div>
    </div>
  );
}