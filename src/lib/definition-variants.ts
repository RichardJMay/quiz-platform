/** One wording per term, picked once before accuracy practice starts. */
export function chooseDefinitionQuestions<T extends {
  correct_term_id: string; question_text: string; rephrased_definition?: string | null;
}>(rows: readonly T[], random: () => number = Math.random): T[] {
  const byTerm = new Map<string, T>()
  for (const row of rows) {
    if (byTerm.has(row.correct_term_id)) continue
    byTerm.set(row.correct_term_id, row.rephrased_definition && random() < 0.5
      ? { ...row, question_text: row.rephrased_definition }
      : { ...row })
  }
  return [...byTerm.values()]
}
