/**
 * Each block of the investment page sits in its own panel, with a faint tone of its own, so the
 * sections read apart at a glance. The tint is translucent: it sits on the page background, so
 * the same classes hold in light and dark.
 */
const tones = {
  plan: { panel: 'border-emerald-500/25 bg-emerald-500/[0.06]', dot: 'before:bg-emerald-500' },
  simulator: { panel: 'border-sky-500/25 bg-sky-500/[0.06]', dot: 'before:bg-sky-500' },
  profile: { panel: 'border-violet-500/25 bg-violet-500/[0.06]', dot: 'before:bg-violet-500' },
  fund: { panel: 'border-amber-500/25 bg-amber-500/[0.06]', dot: 'before:bg-amber-500' },
  markets: { panel: 'border-indigo-500/25 bg-indigo-500/[0.06]', dot: 'before:bg-indigo-500' },
} as const

export type PanelTone = keyof typeof tones

export const panelClass = (tone: PanelTone) => `rounded-xl border p-4 sm:p-5 ${tones[tone].panel}`

/** The panel's title: one step above the text inside it, led by a dot in the panel's tone. */
export const panelTitleClass = (tone: PanelTone) =>
  `flex items-center gap-2 text-base font-semibold text-text-primary before:h-2 before:w-2 before:shrink-0 before:rounded-full ${tones[tone].dot}`
