export function statusVariant(label?: string): 'neutral' | 'blue' | 'green' | 'amber' {
  const t = (label || '').trim()
  if (/工事中/.test(t)) return 'blue'
  if (/見積提出済み|承認/.test(t)) return 'green'
  if (/現調中|見積未提出/.test(t)) return 'amber'
  return 'neutral'
}

export function typeVariant(label?: string): 'neutral' | 'blue' | 'green' | 'amber' | 'violet' | 'indigo' {
  const t = (label || '').trim()
  if (/新築/.test(t)) return 'blue'
  if (/リフォーム|改修|ﾘﾌｫｰﾑ/.test(t)) return 'violet'
  if (/太陽光|ソーラー/.test(t)) return 'indigo'
  if (/外構|土木|造成/.test(t)) return 'amber'
  return 'neutral'
}
