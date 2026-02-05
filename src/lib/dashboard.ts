/**
 * Returns from/to dates for dashboard range filter.
 * Used by admin dashboard (server and API) to keep range logic in one place (DRY).
 */
export function getDateRange(range: string): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  let from = new Date();
  from.setHours(0, 0, 0, 0);
  if (range === "today") {
    from = new Date(to);
    from.setHours(0, 0, 0, 0);
  } else if (range === "7") {
    from.setDate(from.getDate() - 7);
  } else if (range === "30") {
    from.setDate(from.getDate() - 30);
  } else if (range === "month") {
    from.setDate(1);
  } else {
    from.setDate(from.getDate() - 30);
  }
  return { from, to };
}
