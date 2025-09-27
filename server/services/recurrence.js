const DAY = 1000 * 60 * 60 * 24;

// Group transactions by merchant + amount
function groupTransactions(transactions) {
  const groups = {};
  for (const tx of transactions) {
    const merchant = (tx.merchant || tx.description || '').toLowerCase();
    const amount = Math.round(tx.amount * 100) / 100; // round to cents
    const key = `${merchant}-${amount}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(new Date(tx.purchase_date));
  }
  return groups;
}

export function detectRecurring(transactions) {
  const groups = groupTransactions(transactions);
  const recurringSubs = [];

  for (const key in groups) {
    const dates = groups[key].sort((a, b) => a - b);
    if (dates.length < 3) continue;

    // Calculate average interval between charges
    const gaps = dates.slice(1).map((date, i) => (date - dates[i]) / DAY);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    // Detect monthly subscriptions
    if (avgGap >= 27 && avgGap <= 33) {
      const [merchant, amount] = key.split('-');
      recurringSubs.push({
        merchant: merchant.toUpperCase(),
        amount: parseFloat(amount),
        cadence: 'monthly',
        occurrences: dates.length,
        lastDate: dates[dates.length - 1].toISOString().slice(0, 10),
        nextDate: new Date(dates[dates.length - 1].getTime() + 30 * DAY)
          .toISOString()
          .slice(0, 10),
        annualCost: parseFloat((amount * 12).toFixed(2)),
      });
    }
  }

  return recurringSubs;
}
