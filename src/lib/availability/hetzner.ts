import { getHetznerEnv } from "@/env";

type HetznerLocation = {
    name?: unknown;
    city?: unknown;
    country?: unknown;
    network_zone?: unknown;
    available?: unknown;
    recommended?: unknown;
};

export type HetznerServerType = {
    id: number;
    name: string;
    cores: number;
    memory: number;
    disk: number;
    architecture: string;
    locations: HetznerLocation[];
    raw: unknown;
};

function asNumber(value: unknown, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : fallback;
}

function asString(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback;
}

function asLocationList(value: unknown): HetznerLocation[] {
    return Array.isArray(value) ? (value as HetznerLocation[]) : [];
}

export async function fetchHetznerServerTypes(
    signal?: AbortSignal,
): Promise<HetznerServerType[]> {
    const token = getHetznerEnv().HETZNER_API_TOKEN;
    const items: unknown[] = [];
    let page: number | null = 1;

    // API defaults to 25 per page (max 50); follow next_page until null.
    while (page !== null) {
        const response: Response = await fetch(
            `https://api.hetzner.cloud/v1/server_types?per_page=50&page=${page}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                signal,
            },
        );
        const body: unknown = await response.json().catch(() => null);

        if (!response.ok) {
            const message =
                body &&
                typeof body === "object" &&
                "error" in body &&
                body.error &&
                typeof body.error === "object" &&
                "message" in body.error &&
                typeof body.error.message === "string"
                    ? body.error.message
                    : `Hetzner API returned HTTP ${response.status}`;

            throw Object.assign(new Error(message), {
                httpStatus: response.status,
            });
        }

        if (
            !body ||
            typeof body !== "object" ||
            !("server_types" in body) ||
            !Array.isArray(body.server_types)
        ) {
            throw new Error("Hetzner API response missing server_types");
        }

        items.push(...body.server_types);
        const nextPage: unknown = (
            body as { meta?: { pagination?: { next_page?: unknown } } }
        ).meta?.pagination?.next_page;
        page =
            typeof nextPage === "number" && nextPage > page ? nextPage : null;
    }

    return items.map((item: unknown): HetznerServerType => {
        const record =
            item && typeof item === "object"
                ? (item as Record<string, unknown>)
                : {};

        return {
            id: asNumber(record.id),
            name: asString(record.name).toUpperCase(),
            cores: asNumber(record.cores),
            memory: asNumber(record.memory),
            disk: asNumber(record.disk),
            architecture: asString(record.architecture, "unknown"),
            locations: asLocationList(record.locations),
            raw: item,
        };
    });
}

export function normalizeLocationCode(apiName: string) {
    return apiName.toUpperCase();
}

export function readLocation(location: HetznerLocation) {
    const apiName = asString(location.name).toLowerCase();

    return {
        code: normalizeLocationCode(apiName),
        apiName,
        city: asString(location.city, apiName.toUpperCase()),
        country: asString(location.country, ""),
        networkZone: asString(location.network_zone, ""),
        available:
            typeof location.available === "boolean" ? location.available : null,
        recommended:
            typeof location.recommended === "boolean"
                ? location.recommended
                : null,
        raw: location,
    };
}
