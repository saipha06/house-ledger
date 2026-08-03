// Given expenses (with nested expense_splits) and settlements, compute each
// member's net position: positive = owed to them, negative = they owe.
export function computeBalances(members, expenses, settlements) {
  const bal = {};
  members.forEach((m) => (bal[m.id] = 0));

  expenses.forEach((exp) => {
    bal[exp.paid_by] = (bal[exp.paid_by] || 0) + Number(exp.amount);
    (exp.expense_splits || []).forEach((split) => {
      bal[split.member_id] = (bal[split.member_id] || 0) - Number(split.share_amount);
    });
  });

  settlements.forEach((s) => {
    bal[s.from_member] = (bal[s.from_member] || 0) + Number(s.amount);
    bal[s.to_member] = (bal[s.to_member] || 0) - Number(s.amount);
  });

  return bal;
}

// Greedy debt simplification: minimizes the number of payments needed to
// bring every balance to zero.
export function simplifyDebts(balances) {
  const creditors = [];
  const debtors = [];
  Object.entries(balances).forEach(([id, amt]) => {
    const r = Math.round(amt * 100) / 100;
    if (r > 0.005) creditors.push({ id, amt: r });
    else if (r < -0.005) debtors.push({ id, amt: -r });
  });
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const txns = [];
  let ci = 0,
    di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amt = Math.min(c.amt, d.amt);
    if (amt > 0.005) txns.push({ from: d.id, to: c.id, amount: Math.round(amt * 100) / 100 });
    c.amt -= amt;
    d.amt -= amt;
    if (c.amt <= 0.005) ci++;
    if (d.amt <= 0.005) di++;
  }
  return txns;
}

export const fmt = (n) => {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
};
