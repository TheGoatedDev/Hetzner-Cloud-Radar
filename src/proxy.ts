import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MD_PATHS: Record<string, string> = {
    "/": "/md",
    "/methodology": "/md/methodology",
    "/dispatches": "/md/dispatches",
};

export function proxy(request: NextRequest) {
    const accept = request.headers.get("accept") ?? "";
    if (!accept.includes("text/markdown")) return NextResponse.next();
    const dest = MD_PATHS[request.nextUrl.pathname];
    if (!dest) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = dest;
    return NextResponse.rewrite(url);
}

export const config = {
    matcher: ["/", "/methodology", "/dispatches"],
};
