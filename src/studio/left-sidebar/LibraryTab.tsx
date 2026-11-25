import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { ApiHttpError } from '../../api/client';
import { api } from '../../api/endpoints';
import { Part, PartSearchReq } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { useStudioStore } from '../../store/useStudioStore';

export function LibraryTab() {
  const { health, backendOnline } = useAuth();
  const inspectLibraryPart = useStudioStore((s) => s.inspectLibraryPart);
  const inspectedLibraryPart = useStudioStore((s) => s.inspectedLibraryPart);

  const [queryText, setQueryText] = useState('');
  const [engine, setEngine] = useState<'auto' | 'local' | 'octopart'>('auto');
  const [inStock, setInStock] = useState(true);
  const [vInMin, setVInMin] = useState('');
  const [pkgFilter, setPkgFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [valueFilter, setValueFilter] = useState('');

  const [submittedReq, setSubmittedReq] = useState<PartSearchReq>({
    query: '',
    filters: { in_stock: true },
    k: 12,
    engine: 'auto',
  });

  const octopartAvailable = Boolean(health?.octopart);

  const searchQuery = useQuery({
    queryKey: ['parts-search', submittedReq],
    queryFn: async () => {
      if (submittedReq.engine === 'octopart') {
        return api.searchOctopart(submittedReq);
      }
      return api.searchParts(submittedReq);
    },
    enabled: backendOnline,
    retry: 0,
    staleTime: 30_000,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const filters: PartSearchReq['filters'] = {};
    if (inStock) filters.in_stock = true;
    const vNum = Number(vInMin);
    if (vInMin.trim() && Number.isFinite(vNum)) filters.v_in_min = vNum;
    if (pkgFilter.trim()) filters.package = pkgFilter.trim();
    if (categoryFilter.trim()) filters.category = categoryFilter.trim();
    if (valueFilter.trim()) filters.value = valueFilter.trim();

    setSubmittedReq({
      query: queryText.trim(),
      filters,
      k: 16,
      engine,
    });
  };

  const errorText =
    searchQuery.error instanceof ApiHttpError
      ? searchQuery.error.status === 503
        ? 'Octopart / Nexar token is not configured on this backend (503).'
        : searchQuery.error.detail
      : searchQuery.error instanceof Error
        ? searchQuery.error.message
        : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 border-b border-[var(--border)] p-3"
      >
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-dim)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="3.3V low noise LDO, BME280..."
              aria-label="Search component library"
              className="w-full rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] py-1.5 pl-8 pr-2 text-xs text-[var(--text)] placeholder:text-[var(--text-dim)]"
            />
          </div>
          <button
            type="submit"
            disabled={!backendOnline || searchQuery.isFetching}
            className="rounded-[5px] bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-text)] disabled:opacity-50"
          >
            Go
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as 'auto' | 'local' | 'octopart')}
            aria-label="Search engine"
            className="rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-[11px] text-[var(--text)]"
          >
            <option value="auto">Engine: Auto</option>
            <option value="local">Local PartsDB</option>
            <option value="octopart" disabled={!octopartAvailable}>
              Octopart Live {!octopartAvailable ? '(Off)' : ''}
            </option>
          </select>

          <label className="flex cursor-pointer items-center gap-1.5 rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-[11px] text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            <span>In stock (5+)</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="number"
            step="0.1"
            value={vInMin}
            onChange={(e) => setVInMin(e.target.value)}
            placeholder="V_in min (V)"
            aria-label="Minimum voltage rating"
            className="rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-[11px] text-[var(--text)] placeholder:text-[var(--text-dim)]"
          />
          <input
            type="text"
            value={pkgFilter}
            onChange={(e) => setPkgFilter(e.target.value)}
            placeholder="Pkg (SOT-23-5)"
            aria-label="Package filter"
            className="rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-[11px] text-[var(--text)] placeholder:text-[var(--text-dim)]"
          />
          <input
            type="text"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Category (Power)"
            aria-label="Category filter"
            className="rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-[11px] text-[var(--text)] placeholder:text-[var(--text-dim)]"
          />
          <input
            type="text"
            value={valueFilter}
            onChange={(e) => setValueFilter(e.target.value)}
            placeholder="Value (3.3V)"
            aria-label="Value filter"
            className="rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-[11px] text-[var(--text)] placeholder:text-[var(--text-dim)]"
          />
        </div>
      </form>

      <div className="flex-1 overflow-y-auto p-2.5">
        {!backendOnline && (
          <p className="rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-3 text-xs text-[var(--text-muted)]">
            Connect a running <code>hackpcb</code> backend to search the PartsDB vector catalog and Octopart / Nexar.
          </p>
        )}

        {searchQuery.isFetching && (
          <div className="flex items-center gap-2 py-4 text-xs text-[var(--text-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            <span>Searching parts catalog...</span>
          </div>
        )}

        {errorText && (
          <p role="alert" className="rounded-[5px] border border-[var(--err)]/40 bg-[var(--err)]/10 p-2.5 text-xs text-[var(--err)]">
            {errorText}
          </p>
        )}

        {searchQuery.data && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text-dim)]">
              <span>{searchQuery.data.results.length} results</span>
              <span className="font-mono text-[var(--accent)]">{searchQuery.data.engine}</span>
            </div>

            {searchQuery.data.results.map((part: Part) => {
              const selected = inspectedLibraryPart?.mpn === part.mpn;
              return (
                <button
                  key={`${part.mpn}-${part.lcsc_id}`}
                  type="button"
                  onClick={() => inspectLibraryPart(part)}
                  className={`flex w-full flex-col gap-1 rounded-[5px] border p-2.5 text-left transition-colors ${
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
                      : 'border-[var(--border)] bg-[var(--bg-panel-alt)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-[var(--text)] break-all">
                      {part.mpn}
                    </span>
                    <span className="shrink-0 rounded bg-[var(--bg-input)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                      {part.package || 'SMD'}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[11px] text-[var(--text-muted)]">
                    {part.description || part.category || part.manufacturer}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[10.5px] text-[var(--text-dim)]">
                    {part.lcsc_id && <span>{part.lcsc_id}</span>}
                    <span>${Number(part.price || 0).toFixed(3)}</span>
                    <span>stk:{part.stock}</span>
                    {part.score !== null && (
                      <span className="text-[var(--ai)]">sim:{part.score.toFixed(2)}</span>
                    )}
                    {part.octopart_url && (
                      <ExternalLink className="h-3 w-3 text-[var(--accent)]" aria-hidden="true" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
