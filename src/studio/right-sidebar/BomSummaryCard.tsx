import { Receipt } from 'lucide-react';
import { Part, SourcingEntry } from '../../api/types';

interface BomSummaryCardProps {
  partsMap: Record<string, Part>;
  sourcingEntries: SourcingEntry[];
}

export function BomSummaryCard({ partsMap, sourcingEntries }: BomSummaryCardProps) {
  const partList = Object.values(partsMap);
  const count = partList.length || sourcingEntries.length;

  let unitTotal = 0;
  let lcscCount = 0;

  if (partList.length > 0) {
    for (const p of partList) {
      unitTotal += Number(p.price || 0);
      if (p.lcsc_id) lcscCount += 1;
    }
  } else {
    for (const s of sourcingEntries) {
      unitTotal += Number(s.price || 0);
      if (s.lcsc_id) lcscCount += 1;
    }
  }

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-3">
      <div className="flex items-center gap-1.5">
        <Receipt className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
        <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text)]">
          BOM Estimate
        </span>
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded bg-[var(--bg-input)] p-1.5">
          <dt className="text-[9.5px] uppercase text-[var(--text-dim)]">Parts</dt>
          <dd className="font-mono text-xs font-semibold text-[var(--text)]">{count}</dd>
        </div>
        <div className="rounded bg-[var(--bg-input)] p-1.5">
          <dt className="text-[9.5px] uppercase text-[var(--text-dim)]">LCSC</dt>
          <dd className="font-mono text-xs font-semibold text-[var(--text)]">
            {lcscCount}/{count}
          </dd>
        </div>
        <div className="rounded bg-[var(--bg-input)] p-1.5">
          <dt className="text-[9.5px] uppercase text-[var(--text-dim)]">Unit Cost</dt>
          <dd className="font-mono text-xs font-semibold text-[var(--accent)]">
            ${unitTotal.toFixed(2)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
