import type { Family } from "@/lib/schema";
import { FamilyTable } from "../family-table";
import { SectionHeader } from "../section-header";

export function FamilySection({
  family,
  first = false,
}: {
  family: Family;
  first?: boolean;
}) {
  return (
    <section className={`flex flex-col gap-4 ${first ? "pt-10" : "pt-12"}`}>
      <SectionHeader
        kicker={family.kicker}
        title={family.label}
        blurb={family.blurb}
      />
      <FamilyTable family={family} />
    </section>
  );
}
