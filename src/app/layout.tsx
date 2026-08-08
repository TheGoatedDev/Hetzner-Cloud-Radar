import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import { Providers } from "./providers";
import "./globals.css";

// ponytail: no root force-dynamic — kills ISR/CDN. Mark auth/write routes only.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

const title = "Hetzner Cloud availability · live stock by datacentre";
const description =
  "Independent Hetzner Cloud server availability tracker. Live stock by datacentre for CX, CAX, CPX, and CCX — with stock-out history and email dispatches.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: "%s · Hetzner Cloud Radar",
  },
  description,
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
    card: "summary_large_image",
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
    <html
      lang="en"
      className={`${plexMono.variable} ${plexSans.variable} h-full antialiased`}
    >
      <body className="bg-paper text-ink min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
