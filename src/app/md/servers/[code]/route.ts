import { formatObservedAt } from "@/lib/availability/read-model";
import { getServerDetail } from "@/lib/availability/server-detail";
import { renderServerMd } from "@/lib/markdown/pages";
import { markdownResponse } from "@/lib/markdown/response";

export const revalidate = 1200;

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ code: string }> },
) {
    const { code } = await params;
    const detail = await getServerDetail(code);
    if (!detail) {
        return new Response("Server not found\n", {
            status: 404,
            headers: { "Content-Type": "text/markdown; charset=utf-8" },
        });
    }

    return markdownResponse(
        renderServerMd(
            detail,
            detail.latestPollAt
                ? formatObservedAt(detail.latestPollAt)
                : "awaiting first poll",
        ),
    );
}
