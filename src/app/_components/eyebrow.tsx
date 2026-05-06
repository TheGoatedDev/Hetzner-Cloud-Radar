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
      className={`text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint ${className}`}
    >
      {children}
    </Tag>
  );
}
