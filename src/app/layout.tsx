import type { Metadata } from "next";
import { CookieBanner } from "@/app/_components/cookie-banner";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// ponytail: system fonts — next/font pulls capsize metrics into Worker

const title = "Hetzner Cloud availability · live stock by datacentre";
const description =
    "Independent Hetzner Cloud server availability tracker. Live stock by datacentre for CX, CAX, CPX, and CCX, with stock-out history and email dispatches.";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: title,
        template: "%s · Hetzner Cloud Radar",
    },
    description,
    themeColor: [
        {
            media: "(prefers-color-scheme: light)",
            color: "oklch(0.985 0.005 70)",
        },
        {
            media: "(prefers-color-scheme: dark)",
            color: "oklch(0.17 0.012 50)",
        },
    ],
    alternates: {
        canonical: "/",
        types: {
            "application/atom+xml": "/feed.atom",
        },
    },
    openGraph: {
        type: "website",
        locale: "en_GB",
        url: "/",
        siteName: "Hetzner Cloud Radar",
        title,
        description,
    },
    twitter: {
        card: "summary",
        title,
        description,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="h-full antialiased">
            <body className="bg-paper text-ink min-h-full flex flex-col">
                <a href="#main-content" className="skip-link">
                    Skip to content
                </a>
                {children}
                <CookieBanner />
            </body>
        </html>
    );
}
