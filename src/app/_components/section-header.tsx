import type { ElementType } from "react";
import { Eyebrow } from "./eyebrow";

export function SectionHeader({
  kicker,
  title,
  blurb,
  as: TitleTag = "h2",
}: {
  kicker: string;
  title: string;
  blurb?: string;
  as?: Extract<ElementType, "h1" | "h2">;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-hairline pb-3">
      <div className="flex items-baseline justify-between gap-6">
        <TitleTag className="text-lg font-medium tracking-tight text-pretty text-ink">
          {title}
        </TitleTag>
        <Eyebrow as="span">{kicker}</Eyebrow>
      </div>
      {blurb ? (
        <p className="max-w-[68ch] font-sans text-sm leading-[1.55] text-ink-soft">
          {blurb}
        </p>
      ) : null}
    </div>
  );
}
