/** The 24 recovery words, numbered: two columns on mobile, three from `sm` up. */
export function RecoveryPhrase({ mnemonic }: { mnemonic: string }) {
  return (
    <ol className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-border p-4 sm:grid-cols-3">
      {mnemonic.split(' ').map((word, i) => (
        <li key={i} className="flex items-baseline gap-2 text-sm">
          <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
          <span className="font-mono font-medium">{word}</span>
        </li>
      ))}
    </ol>
  )
}
