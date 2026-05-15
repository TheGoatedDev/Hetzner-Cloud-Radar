import { inArray } from "drizzle-orm";
import Restock from "@/emails/restock";
import StockOut from "@/emails/stock-out";
import { getResendEnv } from "@/env";
import type { StockEvent } from "@/lib/schema";
import { getDispatchEvents } from "../availability/read-model";
import { getDb } from "../db/client";
import { locations, marketingDispatchSends, serverTypes } from "../db/schema";
import { hasResendEmailConfig, sendBroadcast } from "../email/send";

type SendMarketingDispatchesResult = {
  attemptedDispatches: number;
  sentDispatches: number;
  sentEmails: number;
  skippedReason: string | null;
};

function splitScope(scope: string) {
  const [serverType, region] = scope.split("/").map((part) => part.trim());

  return { serverType: serverType ?? scope, region: region ?? "unknown" };
}

function eventTopicId(event: StockEvent) {
  const env = getResendEnv();

  return event.state === "ongoing-out"
    ? env.RESEND_SOLD_OUT_TOPIC_ID
    : env.RESEND_RESTOCK_TOPIC_ID;
}

function specLabel(type: typeof serverTypes.$inferSelect | undefined) {
  if (!type) return "tracked server type";

  return `${type.cores} vCPU - ${type.memoryGb} GB RAM - ${type.diskGb} GB`;
}

function durationLabel(event: StockEvent) {
  if (event.state === "resolved-restock") {
    return event.durationLabel.replace(/^after\s+/u, "");
  }

  if (event.state === "ongoing-rollout") {
    return "newly offered";
  }

  return event.durationLabel;
}

async function recordDispatchSend(
  event: StockEvent,
  status: "sent" | "failed" | "skipped",
  recipientCount: number,
  resendEmailIds: string[],
  errorMessage?: string,
) {
  const now = new Date();
  const db = getDb();

  await db
    .insert(marketingDispatchSends)
    .values({
      dispatchId: event.id,
      eventState: event.state,
      scope: event.scope,
      status,
      recipientCount,
      resendEmailIds,
      sentAt: status === "sent" ? now : null,
      errorMessage: errorMessage ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: marketingDispatchSends.dispatchId,
      set: {
        status,
        recipientCount,
        resendEmailIds,
        sentAt: status === "sent" ? now : null,
        errorMessage: errorMessage ?? null,
        updatedAt: now,
      },
    });
}

export async function sendPendingMarketingDispatches(
  latestAt: Date,
): Promise<SendMarketingDispatchesResult> {
  if (!hasResendEmailConfig()) {
    return {
      attemptedDispatches: 0,
      sentDispatches: 0,
      sentEmails: 0,
      skippedReason: "RESEND_API_KEY is not configured",
    };
  }

  const db = getDb();
  const env = getResendEnv();

  if (!env.RESEND_MARKETING_SEGMENT_ID) {
    return {
      attemptedDispatches: 0,
      sentDispatches: 0,
      sentEmails: 0,
      skippedReason: "RESEND_MARKETING_SEGMENT_ID is not configured",
    };
  }

  const events = await getDispatchEvents(latestAt, 16);

  if (events.length === 0) {
    return {
      attemptedDispatches: 0,
      sentDispatches: 0,
      sentEmails: 0,
      skippedReason: null,
    };
  }

  const existingRows = await db
    .select()
    .from(marketingDispatchSends)
    .where(
      inArray(
        marketingDispatchSends.dispatchId,
        events.map((event) => event.id),
      ),
    );
  const sentDispatchIds = new Set(
    existingRows
      .filter((row) => row.status === "sent" || row.status === "skipped")
      .map((row) => row.dispatchId),
  );
  const pendingEvents = events.filter(
    (event) => !sentDispatchIds.has(event.id),
  );

  if (pendingEvents.length === 0) {
    return {
      attemptedDispatches: 0,
      sentDispatches: 0,
      sentEmails: 0,
      skippedReason: null,
    };
  }

  const scopes = pendingEvents.map((event) => splitScope(event.scope));
  const typeCodes = [...new Set(scopes.map((scope) => scope.serverType))];
  const locationCodes = [...new Set(scopes.map((scope) => scope.region))];
  const [typeRows, locationRows] = await Promise.all([
    typeCodes.length > 0
      ? db
          .select()
          .from(serverTypes)
          .where(inArray(serverTypes.code, typeCodes))
      : [],
    locationCodes.length > 0
      ? db
          .select()
          .from(locations)
          .where(inArray(locations.code, locationCodes))
      : [],
  ]);
  const typesByCode = new Map(typeRows.map((type) => [type.code, type]));
  const locationsByCode = new Map(
    locationRows.map((location) => [location.code, location]),
  );

  let sentDispatches = 0;
  const sentEmails = 0;

  for (const event of pendingEvents) {
    const { serverType, region } = splitScope(event.scope);
    const type = typesByCode.get(serverType);
    const location = locationsByCode.get(region);
    const serverSpec = specLabel(type);
    const regionCity = location?.city ?? region;
    const topicId = eventTopicId(event);

    if (!topicId) {
      await recordDispatchSend(
        event,
        "failed",
        0,
        [],
        `${event.state} topic id is not configured`,
      );
      continue;
    }

    try {
      const result = await sendBroadcast({
        segmentId: env.RESEND_MARKETING_SEGMENT_ID,
        subject: event.title,
        topicId,
        name: `Hetzner Cloud Radar: ${event.title}`,
        react:
          event.state === "ongoing-out" ? (
            <StockOut
              serverType={serverType}
              serverSpec={serverSpec}
              region={region}
              regionCity={regionCity}
              observedAt={event.startedAt}
              baselineNote={event.body}
            />
          ) : (
            <Restock
              serverType={serverType}
              serverSpec={serverSpec}
              region={region}
              regionCity={regionCity}
              observedAt={event.startedAt}
              durationLabel={durationLabel(event)}
            />
          ),
      });

      await recordDispatchSend(event, "sent", 0, [result.id]);
      sentDispatches += 1;
    } catch (error) {
      await recordDispatchSend(
        event,
        "failed",
        0,
        [],
        error instanceof Error ? error.message : "Dispatch email send failed",
      );
    }
  }

  return {
    attemptedDispatches: pendingEvents.length,
    sentDispatches,
    sentEmails,
    skippedReason: null,
  };
}
