const JSON_OUTPUT = process.argv.includes("--json");
const VERBOSE = process.argv.includes("--verbose");

// Keep in sync with src/lib/server-families.ts. This script stays .mjs so it can run without a TS loader.
const CONFIGURED_FAMILIES = {
    cx: { visible: true, dispatchEnabled: true },
    cax: { visible: true, dispatchEnabled: true },
    cpx: { visible: true, dispatchEnabled: true },
    ccx: { visible: true, dispatchEnabled: true },
};

const token = process.env.HETZNER_API_TOKEN;

if (!token) {
    throw new Error("HETZNER_API_TOKEN is required");
}

function familyFromCode(code) {
    return (
        code
            .trim()
            .toLowerCase()
            .match(/^([a-z]+)\d+$/u)?.[1] ?? null
    );
}

const response = await fetch("https://api.hetzner.cloud/v1/server_types", {
    headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
    },
});
const body = await response.json().catch(() => null);

if (!response.ok) {
    throw new Error(
        body?.error?.message ?? `Hetzner API returned HTTP ${response.status}`,
    );
}

if (!body || !Array.isArray(body.server_types)) {
    throw new Error("Hetzner API response missing server_types");
}

const liveByFamily = new Map();
const malformed = [];

for (const serverType of body.server_types) {
    const code = String(serverType?.name ?? "").toUpperCase();
    const family = familyFromCode(code);

    if (!family) {
        malformed.push(code || "<missing name>");
        continue;
    }

    liveByFamily.set(family, [...(liveByFamily.get(family) ?? []), code]);
}

const configured = Object.keys(CONFIGURED_FAMILIES).sort();
const visible = configured.filter(
    (family) => CONFIGURED_FAMILIES[family].visible,
);
const dispatch = configured.filter(
    (family) => CONFIGURED_FAMILIES[family].dispatchEnabled,
);
const liveFamilies = [...liveByFamily.keys()].sort();
const unknownFamilies = liveFamilies.filter(
    (family) => !configured.includes(family),
);
const hiddenLiveFamilies = liveFamilies.filter(
    (family) => CONFIGURED_FAMILIES[family]?.visible === false,
);
const missingVisibleFamilies = visible.filter(
    (family) => !liveByFamily.has(family),
);
const invalidConfig = configured.filter(
    (family) =>
        CONFIGURED_FAMILIES[family].dispatchEnabled &&
        !CONFIGURED_FAMILIES[family].visible,
);
const result = {
    configured: { visible, dispatch },
    liveFamilies,
    unknownFamilies,
    hiddenLiveFamilies,
    missingVisibleFamilies,
    malformedServerTypes: malformed,
    invalidConfig,
    liveServerTypes: Object.fromEntries(
        [...liveByFamily.entries()].map(([family, codes]) => [
            family,
            codes.sort(),
        ]),
    ),
};
const failed =
    unknownFamilies.length > 0 ||
    malformed.length > 0 ||
    invalidConfig.length > 0;

if (JSON_OUTPUT) {
    console.log(JSON.stringify(result, null, 2));
} else {
    console.log(
        `Configured: visible ${visible.join(",") || "none"}; dispatch ${
            dispatch.join(",") || "none"
        }`,
    );
    console.log(`Live families: ${liveFamilies.join(",") || "none"}`);

    for (const family of unknownFamilies) {
        console.log(`Unknown family: ${family}`);
        console.log(
            `Add stub: ${family}: { visible: false, dispatchEnabled: false, order: 999 }`,
        );
    }

    for (const code of malformed) {
        console.log(`Malformed server type: ${code}`);
    }

    for (const family of hiddenLiveFamilies) {
        console.log(`Warning: configured hidden family is live: ${family}`);
    }

    for (const family of missingVisibleFamilies) {
        console.log(
            `Warning: configured visible family missing from API: ${family}`,
        );
    }

    for (const family of invalidConfig) {
        console.log(`Invalid config: dispatch enabled while hidden: ${family}`);
    }

    if (VERBOSE) {
        for (const [family, codes] of Object.entries(result.liveServerTypes)) {
            console.log(`${family}: ${codes.join(", ")}`);
        }
    }

    if (!failed) {
        console.log("Server family audit passed");
    }
}

if (failed) {
    process.exitCode = 1;
}
