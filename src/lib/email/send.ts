import { getResendEnv } from "@/env";

type SendInput = {
    to: string | string[];
    subject: string;
    html: string;
    replyTo?: string;
    headers?: Record<string, string>;
    tags?: { name: string; value: string }[];
    topicId?: string;
};

type BroadcastInput = {
    segmentId: string;
    subject: string;
    html: string;
    name?: string;
    previewText?: string;
    replyTo?: string | string[];
    topicId?: string;
};

const fromName = "Hetzner Cloud Radar";

export async function resendJson<T>(
    path: string,
    init?: RequestInit,
): Promise<{
    data: T | null;
    error: { message?: string; statusCode?: number } | null;
}> {
    const key = getResendEnv().RESEND_API_KEY;
    const response = await fetch(`https://api.resend.com${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${key}`,
            "content-type": "application/json",
            ...(init?.headers ?? {}),
        },
    });
    const body = (await response.json().catch(() => null)) as
        | (T & { message?: string })
        | null;

    if (!response.ok) {
        return {
            data: null,
            error: {
                message: body?.message ?? `Resend ${path} failed`,
                statusCode: response.status,
            },
        };
    }

    return { data: body as T, error: null };
}

export function hasResendEmailConfig() {
    return Boolean(process.env.RESEND_API_KEY);
}

export async function sendDispatch(input: SendInput) {
    const env = getResendEnv();
    const result = await resendJson<{ id: string }>("/emails", {
        method: "POST",
        body: JSON.stringify({
            from: `${fromName} <${env.RESEND_FROM_EMAIL}>`,
            to: input.to,
            subject: input.subject,
            html: input.html,
            reply_to: input.replyTo,
            headers: input.headers,
            tags: input.tags,
            topic_id: input.topicId,
        }),
    });

    if (!result.data?.id) {
        throw new Error(result.error?.message ?? "Resend dispatch send failed");
    }

    return { id: result.data.id };
}

export async function sendBroadcast(input: BroadcastInput) {
    const env = getResendEnv();
    const created = await resendJson<{ id: string }>("/broadcasts", {
        method: "POST",
        body: JSON.stringify({
            from: `${fromName} <${env.RESEND_FROM_EMAIL}>`,
            segment_id: input.segmentId,
            subject: input.subject,
            html: input.html,
            name: input.name,
            preview_text: input.previewText,
            reply_to: input.replyTo,
            topic_id: input.topicId,
        }),
    });

    if (!created.data?.id) {
        throw new Error(
            created.error?.message ?? "Resend broadcast create failed",
        );
    }

    const sent = await resendJson<{ id: string }>(
        `/broadcasts/${created.data.id}/send`,
        { method: "POST", body: "{}" },
    );

    if (!sent.data?.id) {
        throw new Error(sent.error?.message ?? "Resend broadcast send failed");
    }

    return { id: sent.data.id };
}
