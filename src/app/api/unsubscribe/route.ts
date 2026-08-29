import { z } from "zod";
import {
    DISPATCH_EVENTS,
    DISPATCH_SERVER_FAMILIES,
} from "@/lib/marketing/preferences";
import {
    syncMarketingContact,
    unsubscribeMarketingContact,
} from "@/lib/marketing/resend";
import { DCS } from "@/lib/schema";

const unsubscribeSchema = z.object({
    email: z.email().transform((email) => email.toLowerCase()),
    token: z.string().optional(),
    events: z.array(z.enum(DISPATCH_EVENTS)),
    families: z.array(
        z
            .string()
            .transform((family) => family.toLowerCase())
            .refine((family) => DISPATCH_SERVER_FAMILIES.includes(family)),
    ),
    datacentres: z.array(z.enum(DCS)),
});

export async function POST(request: Request) {
    const parsed = unsubscribeSchema.safeParse(
        await request.json().catch(() => null),
    );

    if (!parsed.success) {
        return Response.json(
            {
                error:
                    parsed.error.issues[0]?.message ??
                    "Invalid unsubscribe request",
            },
            { status: 400 },
        );
    }

    const { email, events, families, datacentres } = parsed.data;

    try {
        const fullUnsubscribe =
            events.length === 0 ||
            families.length === 0 ||
            datacentres.length === 0;

        if (fullUnsubscribe) {
            await unsubscribeMarketingContact({ email });
        } else {
            await syncMarketingContact({
                email,
                preferences: { events, families, datacentres },
            });
        }

        return Response.json({ ok: true, fullUnsubscribe });
    } catch (error) {
        console.error("Unsubscribe failed", error);

        return Response.json(
            { error: "Unsubscribe failed. Try again in a minute." },
            { status: 500 },
        );
    }
}
