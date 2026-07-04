import { SectionHeader } from "../section-header";
import { SubscribeForm } from "../subscribe-form";

export function Subscribe() {
  return (
    <section className="flex flex-col gap-6 pt-16">
      <SectionHeader
        kicker="Mailing list"
        title="Subscribe to dispatches"
        blurb="One short email when a server type goes sold out or returns to stock."
      />
      <SubscribeForm />
    </section>
  );
}
