export interface YearOptions {
  visible: number[]
  hidden: number[]
}

export function yearOptions(
  years: number[],
  selected: number | null,
  max = 5,
): YearOptions {
  const sorted = [...new Set(years)].sort((a, b) => b - a)
  const limit = Math.max(0, max)
  if (sorted.length <= limit) {
    return { visible: sorted, hidden: [] }
  }

  const visible = sorted.slice(0, limit)
  if (
    limit > 0 &&
    selected !== null &&
    sorted.includes(selected) &&
    !visible.includes(selected)
  ) {
    visible[visible.length - 1] = selected
  }

  return {
    visible,
    hidden: sorted.filter(year => !visible.includes(year)),
  }
}
