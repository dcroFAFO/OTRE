function normalizedCounts(categories = {}) {
  return Object.fromEntries(
    Object.entries(categories)
      .filter(([, count]) => Number(count) > 0)
      .map(([category, count]) => [category, Number(count)]),
  );
}

export function evaluateDiagnosticBudget(currentCategories, budget) {
  const current = normalizedCounts(currentCategories);
  const allowed = normalizedCounts(budget?.categories);
  const currentTotal = Object.values(current).reduce((sum, count) => sum + count, 0);
  const categoryBudgetTotal = Object.values(allowed).reduce((sum, count) => sum + count, 0);
  const maxTotal = Number(budget?.maxTotal);
  const issues = [];

  if (!Number.isInteger(maxTotal) || maxTotal < 0) {
    issues.push("maxTotal must be a non-negative integer");
  } else if (categoryBudgetTotal !== maxTotal) {
    issues.push(`category budgets total ${categoryBudgetTotal}, expected ${maxTotal}`);
  }

  if (Number.isInteger(maxTotal) && currentTotal > maxTotal) {
    issues.push(`total ${currentTotal} exceeds budget ${maxTotal}`);
  }

  for (const [category, count] of Object.entries(current).sort(([a], [b]) => a.localeCompare(b))) {
    const categoryBudget = allowed[category] || 0;
    if (count > categoryBudget) {
      issues.push(`${category} has ${count}, budget ${categoryBudget}`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    currentTotal,
    maxTotal,
  };
}
