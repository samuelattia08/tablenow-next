export function validateBookingSelection(
  date: string,
  partySize: number,
  table: { capacity: number; priceEur: number },
) {
  const parsed = new Date(date);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Date de réservation invalide.");
  }

  if (!Number.isInteger(partySize) || partySize < 1 || partySize > table.capacity) {
    throw new Error("Nombre de personnes invalide.");
  }

  const amount = Math.round(table.priceEur * 100);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new Error("Prix invalide.");
  }

  return amount;
}
