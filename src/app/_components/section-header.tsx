import { Eyebrow } from "./eyebrow";

export function SectionHeader({
  kicker,
  title,
  blurb,
}: {
  kicker: string;
  title: string;
  blurb?: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-hairline pb-3">
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="text-[15px] font-medium tracking-tight text-ink">
          {title}
        </h2>
        <Eyebrow as="span">{kicker}</Eyebrow>
      </div>
      {blurb ? (
        <p className="font-sans text-sm leading-[1.55] text-ink-soft">
          {blurb}
        </p>
      ) : null}
    </div>
  );
}
