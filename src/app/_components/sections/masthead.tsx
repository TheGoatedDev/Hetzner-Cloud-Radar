export function Masthead({ observedAt }: { observedAt: string }) {
  return (
    <header className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-hairline-strong pb-6">
      <p className="text-xl font-semibold tracking-tight text-ink">
        <a href="/" className="hover:text-accent" translate="no">
          Hetzner Cloud Radar
        </a>
      </p>
      <p className="text-xs text-ink-soft sm:ml-auto">
        Observed at <span className="text-ink tabular-nums">{observedAt}</span>
      </p>
    </header>
  );
}
