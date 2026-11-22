import type { MetadataRoute } from "next";
import { getServerCodes } from "@/lib/availability/server-detail";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();
    const servers = (await getServerCodes()).map((code) => ({
        url: `${SITE_URL}/servers/${code.toLowerCase()}`,
        lastModified: now,
        changeFrequency: "hourly" as const,
        priority: 0.6,
    }));
    return [
        {
            url: SITE_URL,
            lastModified: now,
            changeFrequency: "always",
            priority: 1,
        },
        {
            url: `${SITE_URL}/dispatches`,
            lastModified: now,
            changeFrequency: "hourly",
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/methodology`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.5,
        },
        ...servers,
    ];
}
