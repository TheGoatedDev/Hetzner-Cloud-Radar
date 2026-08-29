const LINKS = [
    { href: "/dispatches", label: "All dispatches" },
    { href: "/methodology", label: "Methodology" },
    { href: "/feed.atom", label: "Atom feed" },
];

export function PageFooter({ pollCadence }: { pollCadence: string }) {
    return (
        <footer className="mt-16 flex flex-col gap-2 border-t border-hairline-strong pt-6 text-xs text-ink-soft">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <span>
                    Polled every{" "}
                    <span className="text-ink tabular-nums">{pollCadence}</span>{" "}
                    from the public Hetzner Cloud API.
                </span>
                <span className="text-ink-faint">
                    Independent observation. Not affiliated with Hetzner Online
                    GmbH.
                </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                {LINKS.map((l) => (
                    <a
                        key={l.href}
                        href={l.href}
                        className="text-ink underline-offset-4 hover:text-accent hover:underline"
                    >
                        {l.label}
                    </a>
                ))}
                <span className="text-ink-faint sm:ml-auto">
                    Hetzner Cloud Radar · 2026
                </span>
            </div>
        </footer>
    );
}
