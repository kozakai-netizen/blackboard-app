// ステータス色
export function statusVariant(label?: string): 'neutral' | 'blue' | 'green' | 'amber' {
  const t = (label||'').trim();
  if (/工事中|進行|作業中/.test(t)) return 'blue';
  if (/見積提出済み|承認|完了/.test(t)) return 'green';
  if (/現調中|見積未提出|保留|要確認/.test(t)) return 'amber';
  return 'neutral';
}

// 種類色
export function typeVariant(label?: string): 'neutral' | 'blue' | 'green' | 'amber' | 'violet' | 'indigo' {
  const t = (label||'').trim();
  if (/新築/.test(t)) return 'blue';
  if (/リフォーム|改修|ﾘﾌｫｰﾑ/.test(t)) return 'violet';
  if (/太陽光|ソーラー|PV/.test(t)) return 'indigo';
  if (/外構|土木|造成|設備|電気|配管/.test(t)) return 'amber';
  return 'neutral';
}
