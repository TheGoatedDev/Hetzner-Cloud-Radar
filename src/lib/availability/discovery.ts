import {
    deriveServerFamilyId,
    isConfiguredServerFamily,
    visibleServerFamilies,
} from "@/lib/server-families";
import { getDb } from "../db/client";
import { serverFamilies } from "../db/schema";
import { fetchHetznerServerTypes } from "./hetzner";

export type PublicServerFamily = {
    id: string;
    label: string;
    kicker: string;
    blurb: string;
};

export async function discoverServerFamilies() {
    const fetched = await fetchHetznerServerTypes();
    const unknownFamilies = [
        ...new Set(
            fetched
                .map((serverType) => deriveServerFamilyId(serverType.name))
                .filter(
                    (family): family is string =>
                        family !== null && !isConfiguredServerFamily(family),
                ),
        ),
    ].sort();

    if (unknownFamilies.length === 0) {
        return { discovered: [] as string[], unknownFamilies };
    }

    const db = await getDb();
    const discoveredAt = new Date().toISOString();
    // Do nothing on conflict so hand-edited copy survives later runs.
    const inserted = await db
        .insert(serverFamilies)
        .values(
            unknownFamilies.map((id) => ({
                id,
                label: id.toUpperCase(),
                kicker: "New line",
                blurb: `${id.toUpperCase()} server types recently appeared in the Hetzner Cloud API.`,
                discoveredAt,
            })),
        )
        .onConflictDoNothing()
        .returning({ id: serverFamilies.id });

    return { discovered: inserted.map(({ id }) => id), unknownFamilies };
}

/** Configured visible families in config order, then discovered families by id. */
export async function getPublicServerFamilies(): Promise<PublicServerFamily[]> {
    const db = await getDb();
    const discovered = await db
        .select()
        .from(serverFamilies)
        .orderBy(serverFamilies.id);

    return [
        ...visibleServerFamilies().map(({ id, meta }) => ({
            id,
            label: meta.label,
            kicker: meta.kicker,
            blurb: meta.blurb,
        })),
        // Config wins: a configured family (even a hidden one) ignores its discovered row.
        ...discovered
            .filter(({ id }) => !isConfiguredServerFamily(id))
            .map(({ id, label, kicker, blurb }) => ({
                id,
                label,
                kicker,
                blurb,
            })),
    ];
}
