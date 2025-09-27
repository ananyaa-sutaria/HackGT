// server/services/recurrence.js
const DAY = 1000 * 60 * 60 * 24;

/**
 * Group transactions by merchant-ish key and amount.
 * Works with Nessie purchases: tries merchant/description/payee fields.
 */
function groupTransactions(transactions = []) {
  const groups = {};
  for (const tx of transactions) {
    const merchantRaw =
      (tx.merchant && (tx.merchant.name || tx.merchant)) ||
      tx.description ||
      tx.payee ||
      tx.merchant_id ||
      'unknown';

    const merchant = String(merchantRaw).trim().toLowerCase();
    const amount = Math.round(Number(tx.amount || tx.purchase_amount || tx.total || 0) * 100) / 100;

    // try to read a date (Nessie often has purchase_date)
    const dateStr = tx.purchase_date || tx.transaction_date || tx.date || tx.created_at;
    const date = new Date(dateStr || Date.now());
    if (Number.isNaN(date.getTime())) continue; // skip bad dates

    const key = `${merchant}-${amount}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(date);
  }
  return groups;
}

/**
 * Very simple monthly recurrence detector:
 * - needs >= 3 charges
 * - average interval ~30 days (27..33)
 */
export function detectRecurring(transactions = []) {
  const groups = groupTransactions(transactions);
  const recurring = [];

  for (const key of Object.keys(groups)) {
    const dates = groups[key].sort((a, b) => a - b);
    if (dates.length < 3) continue;

    const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / DAY);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    if (avgGap >= 27 && avgGap <= 33) {
      const [merchant, amountStr] = key.split('-');
      const amount = Number(amountStr);
      const last = dates[dates.length - 1];
      const next = new Date(last.getTime() + 30 * DAY);

      recurring.push({
        merchant: merchant.toUpperCase(),
        amount,
        cadence: 'monthly',
        occurrences: dates.length,
        lastDate: last.toISOString().slice(0, 10),
        nextDate: next.toISOString().slice(0, 10),
        annualCost: Number((amount * 12).toFixed(2)),
      });
    }
  }
  return recurring;
}
