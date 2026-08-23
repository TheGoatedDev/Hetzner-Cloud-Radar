import type { ReactNode } from "react";

export function Eyebrow({
  children,
  as: Tag = "p",
  className = "",
}: {
  children: ReactNode;
  as?: "p" | "span" | "h2" | "h3" | "legend";
  className?: string;
}) {
  return (
    <Tag
      className={`text-xs font-medium tracking-wide text-ink-faint ${className}`}
    >
      {children}
    </Tag>
  );
}
