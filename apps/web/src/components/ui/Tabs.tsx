import * as React from "react";

export function Tabs({ children }: { children: React.ReactNode }) {
  return <div data-slot="tabs">{children}</div>;
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="tabs-list">{children}</div>;
}

export function TabsTrigger({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} className="tabs-trigger">{children}</button>;
}

export function TabsContent({ children }: { children: React.ReactNode }) {
  return <div className="tabs-content">{children}</div>;
}

export default Tabs;
