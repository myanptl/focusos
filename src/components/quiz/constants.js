export const MODES = [
  { key: 'multiple_choice', label: 'Multiple choice' },
  { key: 'short_answer',    label: 'Short answer' },
  { key: 'fill_blank',      label: 'Fill in blank' },
  { key: 'explain',         label: 'Explain it' },
  { key: 'mixed',           label: 'Mixed' },
  { key: 'flashcards',      label: 'Flashcards' },
]
export const DIFFICULTIES = ['Basic', 'Standard', 'Hard', 'Exam Style']

/** Splits "A) Paris" into { letter: 'A', text: 'Paris' }. Falls back to the raw option. */
export function splitOption(opt) {
  const m = opt.match(/^([A-D])[).:\s-]+\s*(.*)$/s)
  return m ? { letter: m[1], text: m[2] } : { letter: null, text: opt }
}
