export function SnipeBanner() {
    return (
        <aside
            aria-label="hcloud-snipe"
            className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 border border-hairline-strong bg-paper-raised px-5 py-4"
        >
            <p className="flex-1 basis-80 text-sm text-ink">
                <span className="mr-2 font-mono text-xs uppercase tracking-[0.12em] text-accent">
                    New
                </span>
                Sold out where you need it?{" "}
                <span className="font-semibold" translate="no">
                    hcloud-snipe
                </span>{" "}
                creates your Hetzner server the moment that type comes back in
                stock.
            </p>
            <a
                href="https://github.com/TheGoatedDev/hcloud-snipe"
                className="inline-flex min-h-11 items-center rounded-edge bg-accent px-5 py-2 font-mono text-sm font-medium text-paper transition-colors hover:bg-accent-deep"
                rel="noopener noreferrer"
                target="_blank"
            >
                Get hcloud-snipe on GitHub
            </a>
        </aside>
    );
}
