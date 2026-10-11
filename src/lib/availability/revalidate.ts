import { revalidatePath } from "next/cache";

// Every ISR route that reads availability data. Keep in sync when adding one.
const AVAILABILITY_PATHS = [
    "/",
    "/dispatches",
    "/api/availability",
    "/md",
    "/md/dispatches",
    "/feed.atom",
];

export function revalidateAvailabilityPaths() {
    for (const path of AVAILABILITY_PATHS) revalidatePath(path);
}
