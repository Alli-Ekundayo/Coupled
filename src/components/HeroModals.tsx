import { X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  BOARD_PRESETS,
  PcbBoardPreset,
  validateBoardFileName,
} from '../utils/pcbLayout';

export type ActiveModal =
  | null
  | 'upload'
  | 'how-it-works'
  | 'product'
  | 'pricing'
  | 'sign-in';

interface HeroModalsProps {
  activeModal: ActiveModal;
  activePresetId: PcbBoardPreset['id'];
  onClose: () => void;
  onApplyBoard: (presetId: PcbBoardPreset['id'], uploadedFileName?: string) => void;
  onReplayAnimation: () => void;
  onOpenUpload: () => void;
}

export function HeroModals({
  activeModal,
  activePresetId,
  onClose,
  onApplyBoard,
  onReplayAnimation,
  onOpenUpload,
}: HeroModalsProps) {
  const [selectedPreset, setSelectedPreset] = useState<PcbBoardPreset['id']>(activePresetId);
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [signInStatus, setSignInStatus] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSelectedPreset(activePresetId);
  }, [activePresetId]);

  useEffect(() => {
    if (!activeModal) return;
    setUploadError(null);
    setSignInStatus(null);
    closeBtnRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, onClose]);

  if (!activeModal) {
    return null;
  }

  const handleUploadSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (fileName.trim()) {
      const check = validateBoardFileName(fileName);
      if (!check.valid) {
        setUploadError(check.error ?? 'Invalid file format.');
        return;
      }
    }
    setUploadError(null);
    onApplyBoard(selectedPreset, fileName.trim() || undefined);
    onClose();
  };

  const handleSignInSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setSignInStatus('Enter a valid work email address.');
      return;
    }
    setSignInStatus(`Sign-in link prepared for ${trimmed}.`);
  };

  const modalTitle: Record<Exclude<ActiveModal, null>, string> = {
    upload: 'Upload a board',
    'how-it-works': 'How Coupled works',
    product: 'About Coupled',
    pricing: 'Simple team pricing',
    'sign-in': 'Sign in to Coupled',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/85 p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hero-modal-title"
        className="w-full max-w-[520px] border border-[var(--color-fg)] bg-[var(--color-bg)] p-6 text-[var(--color-fg)] md:p-8"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-fg)] pb-4">
          <h2
            id="hero-modal-title"
            className="font-display text-xl font-bold tracking-tight text-[var(--color-fg)]"
          >
            {modalTitle[activeModal]}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="btn-secondary flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        {activeModal === 'upload' && (
          <form onSubmit={handleUploadSubmit} className="mt-6 flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-[var(--color-fg)]">
              Choose a local KiCad board or netlist, or preview an existing schematic to watch Coupled generate a rule-compliant layout.
            </p>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="pcb-file-input"
                className="font-mono-label text-xs uppercase tracking-[0.12em] text-[var(--color-fg)]"
              >
                Board file (.kicad_pcb, .kicad_sch, .net)
              </label>
              <input
                id="pcb-file-input"
                type="file"
                accept=".kicad_pcb,.kicad_sch,.net,.json"
                onChange={(e) => {
                  const chosen = e.target.files?.[0]?.name ?? '';
                  setFileName(chosen);
                  setUploadError(null);
                }}
                className="w-full border border-[var(--color-fg)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-fg)] file:mr-3 file:border file:border-[var(--color-fg)] file:bg-[var(--color-bg)] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[var(--color-fg)]"
              />
              {uploadError && (
                <p role="alert" className="text-xs font-medium text-[var(--color-fg)]">
                  {uploadError}
                </p>
              )}
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="font-mono-label mb-1 text-xs uppercase tracking-[0.12em] text-[var(--color-fg)]">
                Or preview reference board
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.values(BOARD_PRESETS).map((preset) => (
                  <label
                    key={preset.id}
                    className={`flex cursor-pointer items-center justify-between border px-3 py-2.5 text-sm ${
                      selectedPreset === preset.id
                        ? 'border-[1.5px] border-[var(--color-fg)] font-semibold'
                        : 'border-[var(--color-fg)] font-normal'
                    }`}
                  >
                    <span>{preset.name}</span>
                    <input
                      type="radio"
                      name="board-preset"
                      value={preset.id}
                      checked={selectedPreset === preset.id}
                      onChange={() => setSelectedPreset(preset.id)}
                      className="h-4 w-4 accent-[var(--color-fg)]"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="btn-primary flex-1 px-5 py-3 text-sm font-medium"
              >
                Propose layout
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-5 py-3 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {activeModal === 'how-it-works' && (
          <div className="mt-6 flex flex-col gap-5">
            <ol className="flex flex-col divide-y divide-[var(--color-fg)] border-y border-[var(--color-fg)]">
              <li className="py-4">
                <p className="font-mono-label text-xs uppercase tracking-[0.12em]">
                  01 · Upload schematic or netlist
                </p>
                <p className="mt-1 text-sm leading-relaxed">
                  Import your KiCad project and board outline. Coupled extracts net classes, differential pairs, and keep-out zones.
                </p>
              </li>
              <li className="py-4">
                <p className="font-mono-label text-xs uppercase tracking-[0.12em]">
                  02 · Constraint-aware placement & routing
                </p>
                <p className="mt-1 text-sm leading-relaxed">
                  Coupled arranges parts by thermal, signal-integrity, and mechanical rules, then routes copper traces with zero DRC errors.
                </p>
              </li>
              <li className="py-4">
                <p className="font-mono-label text-xs uppercase tracking-[0.12em]">
                  03 · Adjust & export in one click
                </p>
                <p className="mt-1 text-sm leading-relaxed">
                  Lock critical components, tweak any trace, and export clean KiCad files or fabrication Gerbers.
                </p>
              </li>
            </ol>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReplayAnimation();
                }}
                className="btn-primary flex-1 px-5 py-3 text-sm font-medium"
              >
                Replay layout animation
              </button>
              <button
                type="button"
                onClick={onOpenUpload}
                className="btn-secondary flex-1 px-5 py-3 text-sm font-medium"
              >
                Upload a board
              </button>
            </div>
          </div>
        )}

        {activeModal === 'product' && (
          <div className="mt-6 flex flex-col gap-5">
            <p className="text-sm leading-relaxed">
              Coupled pairs geometric constraint solving with native KiCad interoperability so electrical engineers go from schematic to fab-ready layout in minutes.
            </p>
            <div className="grid grid-cols-1 divide-y divide-[var(--color-fg)] border border-[var(--color-fg)]">
              <div className="p-4">
                <p className="text-sm font-semibold">Native KiCad round-tripping</p>
                <p className="mt-1 text-sm">Preserves footprints, net labels, and board stackups without proprietary lock-in.</p>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold">Manufacturer rule compliance</p>
                <p className="mt-1 text-sm">Validates trace widths, via clearances, and annular rings against your fab house rules.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenUpload}
              className="btn-primary w-full px-5 py-3 text-sm font-medium"
            >
              Try with a board
            </button>
          </div>
        )}

        {activeModal === 'pricing' && (
          <div className="mt-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 divide-y divide-[var(--color-fg)] border border-[var(--color-fg)]">
              <div className="flex items-baseline justify-between p-4">
                <div>
                  <p className="text-sm font-semibold">Starter</p>
                  <p className="mt-1 text-sm">Up to 4-layer boards, KiCad export</p>
                </div>
                <p className="font-mono-label text-sm font-medium">$0 / mo</p>
              </div>
              <div className="flex items-baseline justify-between p-4">
                <div>
                  <p className="text-sm font-semibold">Pro</p>
                  <p className="mt-1 text-sm">Unlimited layers, impedance control, team seats</p>
                </div>
                <p className="font-mono-label text-sm font-medium">$49 / mo</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenUpload}
              className="btn-primary w-full px-5 py-3 text-sm font-medium"
            >
              Get started
            </button>
          </div>
        )}

        {activeModal === 'sign-in' && (
          <form onSubmit={handleSignInSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="coupled-signin-email"
                className="font-mono-label text-xs uppercase tracking-[0.12em]"
              >
                Work email
              </label>
              <input
                id="coupled-signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@company.com"
                className="w-full border border-[var(--color-fg)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg)]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-fg)]"
              />
            </div>
            {signInStatus && (
              <p role="status" className="text-sm font-medium text-[var(--color-fg)]">
                {signInStatus}
              </p>
            )}
            <button
              type="submit"
              className="btn-primary w-full px-5 py-3 text-sm font-medium"
            >
              Continue with email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
