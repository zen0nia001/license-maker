// Store prices as clients read them. The owner types a price in the listing ("1200", "₱1,200", "PHP 1200" or any
// text); a plain amount is shown in pesos ("₱1,200"), anything else exactly as typed.

/** "1200" → "₱1,200" (null when empty); text that isn't just an amount stays as it is. */
export function peso(raw: string | null | undefined): string | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  const amount = text.replace(/^(₱|php|p)\s*/i, '').replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) return text;
  const cents = amount.includes('.') ? 2 : 0;
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: cents, maximumFractionDigits: cents })}`;
}

/** Whether the owner wrote the price as a plain amount (so " / month" can follow it). */
export const isAmount = (raw: string | null | undefined) => peso(raw)?.startsWith('₱') === true && !/[a-z/]/i.test((raw ?? '').replace(/^php/i, ''));
