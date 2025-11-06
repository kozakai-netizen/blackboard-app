import { tone } from '@/lib/ui/theme';

type Variant = 'neutral'|'blue'|'green'|'amber'|'violet'|'indigo';

export function SiteChip({ text, variant='neutral', testId }:{
  text: string;
  variant?: Variant;
  testId?: string;
}) {
  const map: Record<Variant,string> = {
    neutral: `${tone.chip} ${tone.chipNeutral}`,
    blue:    `${tone.chip} ${tone.chipBlue}`,
    green:   `${tone.chip} ${tone.chipGreen}`,
    amber:   `${tone.chip} ${tone.chipAmber}`,
    violet:  `${tone.chip} ${tone.chipViolet}`,
    indigo:  `${tone.chip} ${tone.chipIndigo}`,
  };
  return <span className={map[variant]} data-testid={testId}>{text || '—'}</span>;
}
