export function formatChartLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const month = d.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });

  return `${month} ${d.getUTCDate()}`;
}
