import { signEmail } from "@/lib/marketing/unsubscribe-token";
import { STOCK, type Stock } from "@/lib/schema";
import { SITE_URL } from "@/lib/site";
import { fontStack, STOCK_COLOR, theme } from "./_components/theme";

const baseUrl = SITE_URL;

function esc(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

async function unsubscribeUrl(recipientEmail?: string) {
    if (!recipientEmail) return "{{{RESEND_UNSUBSCRIBE_URL}}}";
    try {
        const token = await signEmail(recipientEmail);
        return `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipientEmail)}&token=${token}`;
    } catch {
        return `${baseUrl}/unsubscribe`;
    }
}

async function shell(opts: {
    preview: string;
    observedAt?: string;
    recipientEmail?: string;
    body: string;
}) {
    const unsub = await unsubscribeUrl(opts.recipientEmail);
    const observed = opts.observedAt
        ? `<p style="margin:8px 0 0;font-size:11px;color:${theme.inkSoft}">Observed at <span style="color:${theme.ink}">${esc(opts.observedAt)}</span></p>`
        : "";

    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>${esc(opts.preview)}</title></head>
<body style="background:${theme.paper};margin:0;padding:0;font-family:${fontStack.mono};color:${theme.ink}">
  <div style="display:none;max-height:0;overflow:hidden">${esc(opts.preview)}</div>
  <div style="margin:0 auto;padding:32px 24px 48px;max-width:560px">
    <div style="border-bottom:1px solid ${theme.hairlineStrong};padding-bottom:16px;margin-bottom:24px">
      <p style="margin:0;font-size:16px;font-weight:600;letter-spacing:-0.01em;color:${theme.ink}">Hetzner Cloud Radar</p>
      ${observed}
    </div>
    ${opts.body}
    <div style="border-top:1px solid ${theme.hairlineStrong};padding-top:16px;margin-top:32px;font-size:11px;color:${theme.inkSoft}">
      <p style="margin:0 0 6px">Independent observation of the public Hetzner Cloud API. Not affiliated with Hetzner Online GmbH.</p>
      <p style="margin:0;color:${theme.inkFaint}">
        <a href="${baseUrl}/" style="color:${theme.accent};text-decoration:underline;text-underline-offset:3px">Open the radar</a>
        &nbsp;·&nbsp;
        <a href="${unsub}" style="color:${theme.accent};text-decoration:underline;text-underline-offset:3px">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function metaBlock(
    state: Stock,
    kicker: string,
    title: string,
    rows: { label: string; value: string }[],
) {
    const details = rows
        .map(
            (row) =>
                `<p style="margin:10px 0 0;font-size:13px;font-family:${fontStack.mono};color:${theme.inkSoft}"><span style="display:inline-block;width:84px;color:${theme.inkFaint}">${esc(row.label)}</span><span style="color:${theme.ink}">${esc(row.value)}</span></p>`,
        )
        .join("");

    return `<div>
  <p style="margin:0;font-size:10px;font-family:${fontStack.mono};font-weight:500;letter-spacing:0.04em;color:${theme.inkFaint}">${esc(kicker)}</p>
  <p style="margin:8px 0 0;font-size:11px;font-family:${fontStack.mono};font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:${STOCK_COLOR[state]}"><span style="margin-right:8px">${STOCK[state].glyph}</span>${STOCK[state].label}</p>
  <p style="margin:16px 0 8px;font-size:20px;font-family:${fontStack.mono};font-weight:600;letter-spacing:-0.01em;color:${theme.ink};line-height:1.25">${esc(title)}</p>
  ${details}
</div>`;
}

function prose(text: string, soft = false) {
    const color = soft ? theme.inkSoft : theme.ink;
    return `<p style="margin:20px 0 0;font-family:${fontStack.sans};font-size:15px;line-height:1.6;color:${color}">${text}</p>`;
}

export async function stockOutHtml(input: {
    serverType: string;
    serverSpec: string;
    region: string;
    regionCity: string;
    observedAt: string;
    baselineNote: string;
    recipientEmail?: string;
}) {
    const title = `${input.serverType} sold out in ${input.region}`;
    const body = `${metaBlock("sold-out", "Stock event", title, [
        { label: "Type", value: `${input.serverType} (${input.serverSpec})` },
        { label: "Region", value: `${input.region} · ${input.regionCity}` },
        { label: "Observed", value: input.observedAt },
    ])}
  ${prose(`${esc(input.serverType)} is no longer available for new server creation in ${esc(input.regionCity)}. Existing servers are unaffected. The next dispatch will land when ${esc(input.region)} returns to stock.`)}
  ${prose(esc(input.baselineNote), true)}`;

    return shell({
        preview: `${input.serverType} went sold out in ${input.regionCity} (${input.region}).`,
        observedAt: input.observedAt,
        recipientEmail: input.recipientEmail,
        body,
    });
}

export async function restockHtml(input: {
    serverType: string;
    serverSpec: string;
    region: string;
    regionCity: string;
    observedAt: string;
    durationLabel: string;
    recipientEmail?: string;
}) {
    const title = `${input.serverType} returned to ${input.region}`;
    const body = `${metaBlock("available", "Stock event", title, [
        { label: "Type", value: `${input.serverType} (${input.serverSpec})` },
        { label: "Region", value: `${input.region} · ${input.regionCity}` },
        { label: "Sold-out for", value: input.durationLabel },
        { label: "Observed", value: input.observedAt },
    ])}
  ${prose(`${esc(input.serverType)} is available again for new server creation in ${esc(input.regionCity)}. Inventory may be thin for the first day; the next dispatch will land only if it leaves stock again.`)}
  ${prose(`This restock follows a continuous sold-out window of ${esc(input.durationLabel)}.`, true)}`;

    return shell({
        preview: `${input.serverType} is back in ${input.regionCity} (${input.region}).`,
        observedAt: input.observedAt,
        recipientEmail: input.recipientEmail,
        body,
    });
}

export async function subscriptionConfirmationHtml(input: {
    email: string;
    eventCopy: string;
    subscribedTo: string;
}) {
    const body = `<div>
  <p style="margin:0 0 14px;font-family:${fontStack.sans};font-size:15px;line-height:1.55;color:${theme.ink}">Thanks. <span style="font-family:${fontStack.mono}">${esc(input.email)}</span> is on the list. A short note will land when ${esc(input.eventCopy)}.</p>
  <p style="margin:0 0 14px;font-family:${fontStack.sans};font-size:15px;line-height:1.55;color:${theme.inkSoft}">Resend manages the address and preferences. Product analytics via PostHog. Unsubscribe with the link in any dispatch.</p>
  <p style="margin:16px 0 0;font-family:${fontStack.mono};font-size:12px;color:${theme.inkFaint}">Subscribed to: ${esc(input.subscribedTo)}</p>
</div>`;

    return shell({
        preview: "You are subscribed to Hetzner Cloud Radar dispatches.",
        recipientEmail: input.email,
        body,
    });
}
