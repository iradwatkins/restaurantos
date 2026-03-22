/**
 * Validate that split payment amounts sum to the order total.
 * Throws if splits are empty or totals don't match.
 */
export function validateSplitTotal(
  splits: { amount: number }[],
  orderTotal: number
): void {
  if (splits.length === 0) {
    throw new Error("Splits cannot be empty");
  }

  const splitsTotal = splits.reduce((sum, split) => sum + split.amount, 0);
  if (splitsTotal !== orderTotal) {
    throw new Error(
      `Split total (${splitsTotal}) does not equal order total (${orderTotal})`
    );
  }
}
