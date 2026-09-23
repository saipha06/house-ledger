// Pure helpers for grouping/ordering classified transactions from the
// extract-statement Edge Function into the approval queue's tiers. See
// supabase/functions/extract-statement/index.ts for what assigns the tier.
export const TIER_ORDER = ["shared_high", "shared_maybe", "personal_uncertain", "personal_confident"];

const byTierOrder = (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);

// The main queue: likely-shared transactions, most-confident first.
export function mainQueue(transactions) {
  return transactions.filter((t) => t.tier === "shared_high" || t.tier === "shared_maybe").sort(byTierOrder);
}

// The collapsed "skipped as personal" list: uncertain ones first (more
// likely to be a misclassification worth a second look), confident ones
// last and dimmed in the UI.
export function hiddenTiers(transactions) {
  return transactions.filter((t) => t.tier === "personal_uncertain" || t.tier === "personal_confident").sort(byTierOrder);
}
